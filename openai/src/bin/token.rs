use openai_mz::path_resolver::resolve_path;
use std::env;

use openai_mz::tiktoken;

fn main() {
    let mut args = env::args();
    args.next();
    let path = args.next().expect("File path not specified");
    println!("tokenize {}", path);

    let count = tiktoken::count_token_from_path(resolve_path(&path));
    println!("token count: {}", count);
}
