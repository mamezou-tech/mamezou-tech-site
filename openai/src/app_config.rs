use config::Config;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[allow(unused)]
pub struct LintConfig {
    pub prompt: String,
    pub model: String,
    pub temperature: f32,
    pub max_token: u16,
}

#[derive(Debug, Deserialize)]
#[allow(unused)]
pub struct ScoringConfig {
    pub prompt: String,
    pub model: String,
    pub temperature: f32,
    pub max_token: Option<u16>,
}

impl LintConfig {
    pub fn load() -> Self {
        read_config("lint").expect("lint section not found")
    }
}

impl ScoringConfig {
    pub fn load() -> Self {
        read_config("scoring").expect("scoring section not found")
    }
}

fn read_config<'a, T>(section: &str) -> Result<T, config::ConfigError>
where
    T: Deserialize<'a>,
{
    let config = Config::builder()
        .add_source(config::File::with_name("config"))
        .build();
    config.unwrap().get::<T>(section)
}
