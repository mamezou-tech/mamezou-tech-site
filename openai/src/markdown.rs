use std::fs::File;
use std::io::Read;
use gray_matter::engine::YAML;
use gray_matter::Matter;
use crate::path_resolver::resolve_path;
use crate::tiktoken;

pub struct Markdown {
    pub title: String,
    pub tags: Vec<String>,
    pub content: String,
}

impl Markdown {
    pub fn load(path: &str) -> Self {
        let mut f = File::open(resolve_path(&path)).expect("File not found");
        let mut contents = String::new();
        f.read_to_string(&mut contents)
            .expect("Cannot read contents");
        Markdown::new(&contents)
    }

    pub fn new(markdown: &str) -> Self {
        let matter = Matter::<YAML>::new();
        let result = matter.parse(&markdown);
        let pod = result.data.as_ref().unwrap();
        let map = pod.as_hashmap().unwrap();
        let title = match map.get("title") {
            Some(title) => title.as_string().unwrap(),
            None => "".to_string(),
        };
        let tags = match map.get("tags") {
            Some(tags) => tags.as_vec()
                .unwrap_or(vec![])
                .iter()
                .map(|pod| pod.as_string().unwrap())
                .collect(),
            None => Vec::new(),
        };
        Markdown {
            title,
            tags,
            content: result.content
        }
    }

    pub fn split_chunk(&self) -> Vec<String> {
        let rows = self.content.split("\n").filter(|row| (**row).trim() != "");
        let chunks = rows.fold(Vec::new(), |acc: Vec<String>, cur| {
            let mut result = acc.clone();
            if cur.starts_with("# ") || cur.starts_with("## ") {
                result.push(cur.to_string());
            } else {
                if let Some(last) = result.pop() {
                    result.push([last, cur.to_string()].join("\n"))
                } else {
                    result.push(cur.to_string());
                }
            }
            result
        });
        chunks
    }

    pub fn token_count(&self) -> u32 {
        tiktoken::count_token(&self.content)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new() {
        let md = "---
title: TEST
tags: [aws, azure, gcp]
---
abcdefg
## sub title";
        let md = Markdown::new(md);
        assert_eq!(md.title, "TEST");
        assert_eq!(md.tags, vec!["aws", "azure", "gcp"]);
        assert_eq!(md.content, "abcdefg\n## sub title")
    }

    #[test]
    fn test_no_tag() {
        let md = "---
title: TEST
---
abcdefg";
        let md = Markdown::new(md);
        assert_eq!(md.title, "TEST");
        assert_eq!(md.tags, Vec::<String>::new());
        assert_eq!(md.content, "abcdefg")
    }

    #[test]
    fn test_split_chunk() {
        let text = "---

title: test
---
intro
# title
aaa aaa
bbb bbb
ccc ccc

## title
ddd eee
fff ggg
"; // 25 token
        let md = Markdown::new(&text);
        let chunks = md.split_chunk();
        assert_eq!(
            chunks,
            vec![
                "intro",
                "# title\naaa aaa\nbbb bbb\nccc ccc",
                "## title\nddd eee\nfff ggg"
            ]
        );
    }
}