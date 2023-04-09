use async_openai::types::{
    ChatCompletionRequestMessageArgs, CreateChatCompletionRequestArgs, Role,
};
use async_openai::Client;
use openai_mz::{app_config, markdown};
use openai_mz::chat_stream_writer::write_stream;
use std::env;
use std::error::Error;
use openai_mz::markdown::Markdown;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let mut args = env::args();
    args.next();
    let path = args.next().expect("File path not specified");
    let config = app_config::LintConfig::load();

    let article = markdown::Markdown::load(&path);
    let chunks = split_chunk(&article, None);

    let client = Client::new();
    for (i, chunk) in chunks.iter().enumerate() {
        println!("------ Chunk({}/{}) -------", i + 1, chunks.len());
        println!("対象: {}\n", chunk.lines().next().unwrap_or(""));
        let content = format!(
            "{prompt}\n\n```\n{chunk}\n```",
            prompt = config.prompt,
            chunk = chunk
        );
        let request = CreateChatCompletionRequestArgs::default()
            .model(&config.model)
            .max_tokens(config.max_token)
            .temperature(config.temperature)
            .messages([ChatCompletionRequestMessageArgs::default()
                .content(content)
                .role(Role::User)
                .build()?])
            .build()?;
        let mut stream = client.chat().create_stream(request).await?;
        write_stream(&mut stream).await.unwrap();
    }
    Ok(())
}

fn split_chunk(md: &Markdown, limit_size: Option<u32>) -> Vec<String> {
    let count = md.token_count();
    println!("token: {}", count);
    if count < limit_size.unwrap_or(3000) {
        return vec![md.content.to_string()];
    }
    println!(
        "large document(token={}). split contents into chunks...",
        count
    );
    md.split_chunk()
}
