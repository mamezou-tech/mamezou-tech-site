use async_openai::error::ApiError;
use async_openai::types::ChatCompletionResponseStream;
use futures::StreamExt;
use std::io::{stdout, Write};

pub async fn write_stream(stream: &mut ChatCompletionResponseStream) -> Result<(), ApiError> {
    let mut lock = stdout().lock();

    while let Some(result) = stream.next().await {
        match result {
            Ok(response) => response.choices.iter().for_each(|choice| {
                if let Some(ref content) = choice.delta.content {
                    write!(lock, "{}", content).unwrap();
                }
            }),
            Err(err) => writeln!(lock, "error: {:?}", err).unwrap(),
        }
        stdout().flush().unwrap();
    }
    println!();
    Ok(())
}
