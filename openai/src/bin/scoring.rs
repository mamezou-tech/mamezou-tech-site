use async_openai::error::OpenAIError;
use async_openai::types::{
    ChatCompletionRequestMessageArgs, CreateChatCompletionRequestArgs, Role,
};
use async_openai::Client;
use openai_mz::app_config;
use regex::Regex;
use std::env;
use std::error::Error;
use openai_mz::markdown::Markdown;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let mut args = env::args();
    args.next();
    let path = args.next().expect("File path not specified");
    let md = Markdown::load(&path);
    let config = app_config::ScoringConfig::load();

    let client = Client::new();
    let result = try_review(&config, &md.content, &client).await;
    match result {
        Err(error) => match error {
            OpenAIError::ApiError(error) => {
                let code = error.code.unwrap();
                let code = code.as_str().unwrap();
                if code == "context_length_exceeded" {
                    retry_review(&config, &md.content, &client).await;
                } else {
                    panic!("API Error: {}", error.message);
                }
            }
            _ => (),
        },
        _ => (),
    }
    Ok(())
}

async fn retry_review(config: &app_config::ScoringConfig, contents: &str, client: &Client) {
    println!(
        "ChatGPTの最大長を超えました。前半{}行のみでレビュー依頼します。。。",
        200
    );
    let re = Regex::new(r"\r?\n").unwrap();
    let taken: Vec<&str> = re.split(&contents).take(200).collect();
    try_review(&config, &taken.join("\n"), &client)
        .await
        .unwrap();
}

async fn try_review(
    config: &app_config::ScoringConfig,
    contents: &str,
    client: &Client,
) -> Result<(), OpenAIError> {
    let content = format!("{prompt}\n\n```\n{contents}\n```", prompt = config.prompt);
    let request = CreateChatCompletionRequestArgs::default()
        .model(&config.model)
        .temperature(config.temperature)
        .messages([ChatCompletionRequestMessageArgs::default()
            .content(content)
            .role(Role::User)
            .build()
            .unwrap()])
        .build();
    let resp = client.chat().create(request.unwrap()).await?;
    println!("{}", resp.choices[0].message.content);
    Ok(())
}
