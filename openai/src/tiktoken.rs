use std::fs::File;
use std::io::Read;

pub fn count_token_from_path(path: String) -> u32 {
    let mut f = File::open(path).expect("File not found");
    let mut contents = String::new();
    f.read_to_string(&mut contents)
        .expect("Cannot read contents");
    count_token(&contents)
}

pub fn count_token(data: &str) -> u32 {
    let encoding = tiktoken_rs::cl100k_base().unwrap();
    let count = encoding.encode_with_special_tokens(data).len();
    u32::try_from(count).unwrap()
}
