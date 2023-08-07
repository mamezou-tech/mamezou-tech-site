---
title: 日本語GPTで雑談対話モデルを作ろう
author: takafumi-okubo
date: 2023-08-07
tags: [summer2023,自然言語処理,機械学習,GPT,OpenAI,大規模言語モデル,LLM,ファインチューニング]
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2023-summer/
---
この記事は[夏のリレー連載2023](/events/season/2023-summer/)の11日目の記事です。

# はじめに
最近ChatGPTをはじめ生成系AIツールが様々、発表されています。

大量のテキストデータを使ってトレーニングされた大規模言語モデル（LLM）では、そのモデルを用いたツールはもちろんのこと、モデルそのものも日進月歩の勢いで多数開発されています。
更にChatGPTなどのツールを活用したり、LLMそのものをファインチューニングすることで、特定の役割に特化したAIサービスも増えてきていますね！[^footnote_api_service]
今後、様々な分野でチャットボットや文章生成ツールなどが作られどんどんと活用されていくことでしょう。
（実はこの文章も一部AIに考えてもらっています笑）

しかしただ単純にくだらない雑談をするだけのAIボット、というのもあってもいいのではないでしょうか。
何の情報も生産性もない、友達のようにただおしゃべりをするだけのボットがあっても面白そうです。

というわけで今回は、日本語版GPTであるRinna-3.6Bをファインチューニングにすることで雑談に特化した対話モデル（以下、雑談対話モデル）を作ってみました。

本記事では、まず初めに使用したLLMや学習データを紹介します。
次に実際にRinna-3.6Bのファインチューニング方法を説明します。
最後に実際に学習させた雑談対話モデルを検証していきます。

なお本記事で参考にした記事やサイトは[参考](#参考)にて紹介しております。
興味がある方はぜひそちらも御覧ください！

# モデルや学習データの紹介
## Rinna-3.6Bの紹介
今回使用したLLMは「Rinna」が開発した日本語LLMのRinna-3.6Bです。
Rinna-3.6Bでは、次の4種類のモデルが公開されています。

- [rinna/japanese-gpt-neox-3.6b](https://huggingface.co/rinna/japanese-gpt-neox-3.6b)：ベースモデル
- [rinna/japanese-gpt-neox-3.6b-instruction-sft](https://huggingface.co/rinna/japanese-gpt-neox-3.6b-instruction-sft)：SFTモデル
- [rinna/japanese-gpt-neox-3.6b-instruction-sft-v2](https://huggingface.co/rinna/japanese-gpt-neox-3.6b-instruction-sft-v2)：SFTモデル
- [rinna/japanese-gpt-neox-3.6b-instruction-ppo](https://huggingface.co/rinna/japanese-gpt-neox-3.6b-instruction-ppo)：RLHFモデル

1番目がRinna-3.6Bのベースモデルであり、汎用言語モデルです。
このモデルをファインチューニングして対話言語モデルになったのがSFTモデル（2番目、3番目）です。
更にSFTモデルに基づき強化学習を行ったモデルが4番目のRLHFモデルとなります。

今回は雑談対話モデルを作っていくので、強化学習済み対話言語モデルのRLHFモデルを使っていきます。
実際にこのモデルでどのような文章が出力されるのかを見ていきましょう。
Google Colaboratoryで必要なライブラリをインストールして（後に紹介します）、Rinna-3.6Bと対話するスクリプトを書きました。

```python
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

model_id="rinna/japanese-gpt-neox-3.6b-instruction-ppo"

tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=False)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    load_in_8bit=True,
    device_map="auto"
)

while True:
    text = input("入力どうぞ : ")
    if text == "quit":
        break
    else:
        text = text.replace("\n", "<NL>")
        text = f"ユーザー: {text}<NL>システム: "
        token_ids = tokenizer.encode(
            text, add_special_tokens=False, return_tensors="pt"
        )
        with torch.no_grad():
            output_ids = model.generate(
                token_ids.to(model.device),
                do_sample=True,
                max_new_tokens=128,
                temperature=0.7,
                pad_token_id=tokenizer.pad_token_id,
                bos_token_id=tokenizer.bos_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )

        output = tokenizer.decode(output_ids.tolist()[0][token_ids.size(1) :])
        output = output.replace("<NL>", "\n").replace("</s>", "")
        print(output)

```

出力結果としては以下のようになります。

```bash
入力どうぞ : こんにちは
こんにちは。素晴らしい一日を過ごしてください。良い一日を過ごして、健康で幸せな気持ちで家に帰ることができますように。素敵な一日を過ごしてください。良い一日を過ごして、健康で幸せな気持ちで家に帰ることができますように。素敵な一日を過ごしてください。良い一日を過ごしてください。素敵な一日を過ごしてください。素敵な一日を過ごしてください。素敵な一日を過ごしてください。素敵な一日を過ごしてください。素敵な一日を過ごしてください。素敵な一日を過ごしてください。素敵な一日を過ごしてください。

入力どうぞ : 暑いですね
本当に暑いです。 はい、確かに暑いです。 この暑い天気の原因は、主にアジアのモンスーンによるものです。 湿気が増し、空気中に多くの水蒸気が含まれ、熱が放出されます。 また、東南アジアの熱帯気候では、土壌が空気中の湿気を保持するのにも役立ちます。 これにより、強い熱が発生し、土壌が温まり、蒸発が促されます。 さらに、東南アジアの高温多湿な条件では、空気中の水蒸気が凝縮して、土壌に水分が蓄積されます。 これにより、

入力どうぞ : 今日どこ行く？
素晴らしい質問ですね。一緒に素敵な公園に行きましょう。公園のどこに行きたいですか? 公園は広いですので、公園のどこに行きたいかを明確にすることをお勧めします。 例えば、公園の中心にある噴水や、ビーチのような美しい景色が見える公園などがあります。 公園の美しさを楽しむために、公園の美しい景色が見える公園に行くことをお勧めします。 公園の美しい景色が見える公園は、美しい公園の中心にある噴水や、ビーチのような美しい景色が見られる公園などがあります。 公園の美しさを楽しむために、公園の中心にある噴水や、ビーチのような美しい景色が見られる公園
```

「入力どうぞ：」の後が、私が書いた部分となります。改行後の文章はRinna-3.6Bが出力しています。
かなり自然な文章になっているように思えます。

しかし友達と雑談をしているような、と言われると少し固い文章な気もします。
雑談対話モデルとするにはもう少し柔らかい言葉にしてほしいです。

## 名大会話コーパス
というわけで、日本語の会話（特に雑談）を収録しているデータはないか、と探したところまさにというものがありました。
それが、名古屋大学が出している『[名大会話コーパス](https://mmsrv.ninjal.ac.jp/nucc/)』です。
このコーパスは日本語・日本語教育研究のために作られており129会話・合計約100時間の会話が纏められています。
親しい者同士の雑談はもちろん、初対面同士、先輩・後輩の会話もあって学習データとしてはかなり良さそうです。
今回は実験ということもあり、このコーパス全て使うのではなく、1会話（1ファイル）のみを使ってファインチューニングを行いました。

# Rinna-3.6Bのファインチューニング
## 下準備
それではさっそくGoogle Colaboratoryを使ってファインチューニングを行っていきましょう。
まずは使う学習データをダウンロードします。
[名大会話コーパス](https://mmsrv.ninjal.ac.jp/nucc/)にアクセスして、文字化資料ダウンロードのリンクを押下してダウンロードします。
![](https://i.gyazo.com/a1fbd20639b0fecd567a55141303aaaa.png)

ダウンロードした後、展開してGoogle Driveにアップロードします。
私の場合は、今回使うGoogle Colaboratoryと同じ階層にdatasetフォルダを作りその中に入れました。
![](https://i.gyazo.com/3b0ca1da03010806d3f388c8e4ae225e.png)

※今回はお試しなのでひとつしか入れていません
![](https://i.gyazo.com/7cc511fe2d360ee9989ce0329ca315e6.png)

その後、Google Colaboratoryを新規作成しGoogleドライブのマウントを実行し、cdコマンドで新規作成したファイルがある場所に移動します。

ここら辺のやり方は[以前掲載した記事](/blogs/2022/07/08/gpt-2-japanese/#環境構築)に記載しております。
ぜひ参考にしてみてください。

## 必要なライブラリのインストール
以下を実行して今回必要なライブラリをインストールします。

```bash
# https://www.philschmid.de/fine-tune-flan-t5-peft
# install Hugging Face Libraries
!pip install "peft==0.2.0"
# transformers[ja]はtransformersの日本語対応のライブラリ
!pip install "transformers[ja]==4.27.2" "datasets==2.9.0" "accelerate==0.17.1" "evaluate==0.4.0" "bitsandbytes==0.37.1" loralib --upgrade --quiet
# install additional dependencies needed for training
!pip install rouge-score tensorboard py7zr
# sentencepieceは日本語のようにスペースで単語が区切られていない言語を利用するためのライブラリ
!pip install sentencepiece
```

今回はLoRAと呼ばれる手法を用いてファインチューニングを行っていきます。
LoRAとは、PEFT（Parameter-Efficient Fine-Tuning）と呼ばれる、モデルの一部のパラメータだけをファインチューニングする手法のひとつです。
そのため、LoRAを利用するためのライブラリ（peft）をインストールします。
また今回は日本語学習済みモデルを使っていきますので、sentencepiece（日本語のようにスペースで単語が区切られていない言語を利用するためのライブラリ）もインストールしました。

## モデルの読み込み
以下のコードを実行してモデルをロードします。

```python
import torch
from transformers import AutoTokenizer, AutoConfig, AutoModelForCausalLM

model_id="rinna/japanese-gpt-neox-3.6b-instruction-ppo"

tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=False)
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    load_in_8bit=True,
    device_map="auto"
)
```

続いてトークナイズ関数を定義します。

```python
CUTOFF_LEN = 256  # コンテキスト長

# トークナイズ
def tokenize(prompt, tokenizer):
    result = tokenizer(
        prompt,
        truncation=True,
        max_length=CUTOFF_LEN,
        padding=False,
    )
    return {
        "input_ids": result["input_ids"],
        "attention_mask": result["attention_mask"],
    }

# トークナイズの動作確認
tokenize("hi there", tokenizer)
```

```bash
{'input_ids': [3201, 634, 1304, 3], 'attention_mask': [1, 1, 1, 1]}
```

上のように「input_ids」の最後にEOS「3」が追加されてることを確認します。

## 学習データの準備
ここから学習データを用意していきます。
今回使用するファイルは名大会話コーパス内にある「data003.txt」です。
ユーザーとAIとの会話を想定していますので、2人同士の会話を抽出するためにこのファイルを選択しました。
（ここら辺はなんでもよいとは思いますし、今後のことも考えてフォルダ内の任意の数のファイルを読み込むような仕組みを作っていこうと思います）

まずファイルの中身を見ていきましょう。
以下は一部抜粋したものとなります。

```bash
＠データ０３（４３分）
＠収集年月日：２００１年１０月２３日
＠場所：車中（某大から所属大学への帰り道。運転者F033）
＠参加者F033：女性２０代後半、愛知県岩倉市出身、同市在住
＠参加者F056：女性２０代前半、愛知県岡崎市出身、同市在住
＠参加者の関係：大学院の同級生
F033：倒れちゃう。
F056：いきなり倒れた。
F033：どうしよう。あっ、この間に。
F056：あ、大丈夫、大丈夫。
＜間＞
F033：暑い。
暑かったらこれ調節して。
F056：うん。ありがと。大丈夫。
こっからどれぐらい？
F033：こっからー、え、４０分で着けると思うけど。
F056：あ、ほんと。（うん）
そうなんだ。
```

文章の続きを書くのではなく会話をしていきたいのでこのファイルを無加工で使ってファインチューニングするのは少し無理がありますね。
会話をしていくにはinputとoutputの組が必要になります。
それに冒頭の＠や途中にある＜間＞や改行などがありますので、フォーマットを少し変えたほうがよさそうです。
具体的には以下のような形になることが理想でしょうか？

```json
[
  {
    "input": "倒れちゃう。",
    "output": "いきなり倒れた。"
  },
  {
    "input": "いきなり倒れた。",
    "output": "どうしよう。あっ、この間に。"
  },
  {
    "input": "どうしよう。あっ、この間に。",
    "output": "あ、大丈夫、大丈夫。"
  },
  {
    "input": "あ、大丈夫、大丈夫。",
    "output": "暑い。暑かったらこれ調節して。"
  },
  {
    "input": "暑い。暑かったらこれ調節して。",
    "output": "うん。ありがと。大丈夫。こっからどれぐらい？"
  },
  {
    "input": "うん。ありがと。大丈夫。こっからどれぐらい？",
    "output": "こっからー、え、４０分で着けると思うけど。"
  },
  {
    "input": "こっからー、え、４０分で着けると思うけど。",
    "output": "あ、ほんと。そうなんだ。"
  }
]
```

上記のようなJSON形式でファイルを出力するスクリプトを作成しました。

```python
import json
import re

# テキストファイルを読み込み、JSONデータを作成
def create_json_file(file_path, data):
  # テキストデータを読み込む
  with open(file_path, 'r', encoding='utf-8') as file:
    lines = file.readlines()

  participants = ["Ｘ："] # 会話の参加者を抽出（Ｘは参加者以外の人物や携帯、放送など）
  conversation_list = [] # 会話部分の抽出

  conversation = None
  prev_speaker = None
  
  # 会話部分を抽出
  for line in lines:
    line = line.strip()

	# 参加者の抽出
    if line.startswith("＠参加者"):
      participant, _ = line.split("：", 1)
      participants.append(participant.replace('＠参加者', ''))
      continue

	# 不要な部分は抜く
    if "＠" in line or "％ｃｏｍ：" in line or "＜間＞" in line:
      continue

	# 会話部分の抽出
    if "：" in line:
      speaker, conversation = line.split("：", 1)

      conversation_list.append(speaker + "：" + conversation)
      prev_speaker = speaker
    else:
      if prev_speaker and prev_speaker in participants:
        # 文中に参加者の表示がない場合、最後の行に会話を付け足す
        conversation_list[-1] += line

  print(conversation_list)

  # JSON形式にデータを加工
  for i in range(len(conversation_list) - 1):
    input_text = conversation_list[i]
    output_text = conversation_list[i + 1]

    for participant in participants:
      input_text = input_text.replace(participant + '：', '').strip()
      output_text = output_text.replace(participant + '：', '').strip()

    data.append({
        'input': re.sub(r'＜.*＞|（.*）', '', input_text),
        'output': re.sub(r'＜.*＞|（.*）', '', output_text)
    })

import os
import glob

# 対象のフォルダのファイルを再帰的に探索しテキストファイルを読み込みJSONデータを作成
def create_json_files_recursive(directory_path, max_files_to_open, data):
    file_counter = 0

    # フォルダ内のファイルを再帰的に探索
    for root, _, files in os.walk(directory_path):
        for filename in files:
            # テキストファイルのみを対象とする場合
            if filename.endswith(".txt"):
                file_path = os.path.join(root, filename)
                print(f"Reading: {file_path}")

                # ファイルを開いてJSON形式に格納する
                create_json_file(file_path, data)

                file_counter += 1

            # 指定したファイル数に達したらループを終了
            if file_counter >= max_files_to_open:
                break

        # 指定したファイル数に達したらループを終了
        if file_counter >= max_files_to_open:
            break

# ファイルがあるフォルダ
directory_path = "./dataset/"
# 読み込むファイル数
max_files_to_open = 1
data = []

# 対象のフォルダのファイルを再帰的に探索しテキストファイルを読み込みJSONデータを作成します。
create_json_files_recursive(directory_path, max_files_to_open, data)

# JSON形式で保存
output_path = "json/train_data.json"
with open(output_path, 'w', encoding='utf-8') as outfile:
  json.dump(data, outfile, ensure_ascii=False, indent=2)

print("JSONファイルの保存が完了しました。")
```

作成したJSONはjsonフォルダに格納しました。
これで準備完了です。
念のため、学習データの中身を以下のコードで確認します。

```python
import json

# 学習データの確認
output_path = "json/train_data.json"
with open(output_path, 'r', encoding='utf-8') as f:
  loaded_data = json.load(f)

print(loaded_data[1])
```
```bash
{'input': 'いきなり倒れた。', 'output': 'どうしよう。あっ、この間に。'}
```

## プロンプトテンプレートの準備
学習データも準備できましたので、ここからモデルに学習させていきたいと思います。
今回の学習では、[この記事](https://note.com/npaka/n/nc387b639e50e)を参考にしてファインチューニングのスクリプトを作成しました。

まず学習用に、レスポンス内容（`data_point["output"]`）があるプロンプトテンプレートの準備をします。

```python
# プロンプトテンプレートの準備
def generate_prompt(data_point):
    result = f"""### 指示:
{data_point["input"]}

### 回答:
{data_point["output"]}
"""
    # 改行→<NL>
    result = result.replace('\n', '<NL>')
    return result
```

こちらのメソッドを確認します。
```python
# プロンプトテンプレートの確認
print(generate_prompt(loaded_data[5]))
```
```bash
### 指示:<NL>うん。ありがと。大丈夫。こっからどれぐらい？<NL><NL>### 回答:<NL>こっからー、え、４０分で着けると思うけど。<NL>
```

## データセットの準備
以下のコードで学習用と検証用のデータセットを作成します。

```python
# データセットの準備
VAL_SET_SIZE = 1000

train_dataset = []
val_dataset = []

for i in range(len(loaded_data)):
  if i % 5 == 0:
      x = tokenize(generate_prompt(loaded_data[i]), tokenizer)
      val_dataset.append(x)
  else:
      x = tokenize(generate_prompt(loaded_data[i]), tokenizer)
      train_dataset.append(x)
```

## ファインチューニング
ここまでできてようやくファインチューニングとなります。
まずファインチューニングのための設定をします。
今回はLoRAという手法を使っていきますので、そのためにLoRAモデルを準備します。

```python
from peft import LoraConfig, get_peft_model, prepare_model_for_int8_training, TaskType

# LoRAコンフィグ
lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    target_modules=["query_key_value"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)
model = prepare_model_for_int8_training(model)

# モデルにLoRAを追加する
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
```

上記で準備したモデルに対してファインチューニングを行います。

```python
from torch.cuda import amp
from transformers import Trainer, TrainingArguments
from transformers import DataCollatorForLanguageModeling

# モデルをGPU上で単精度浮動小数点数に変換（この変換をしないとエラーが出てしまいました）
model = model.float()

output_dir="./results/output_results"
eval_steps = 200
logging_steps = 20

data_collator = DataCollatorForLanguageModeling(tokenizer, mlm=False)

training_args = TrainingArguments(
    output_dir=output_dir,
    auto_find_batch_size=True,
    learning_rate=1e-4,
    num_train_epochs=3,
    logging_dir=f"{output_dir}/logs",
    logging_strategy="steps",
    logging_steps=logging_steps,
    save_strategy="no",
    report_to="tensorboard",
    evaluation_strategy="steps",
    eval_steps=eval_steps,
    save_total_limit=3,
    push_to_hub=False
)

# トレーナーの準備
trainer = Trainer(
    model=model, # 対象のモデル
    args=training_args, # 学習時の設定
    data_collator=data_collator, # データコレーター
    train_dataset=train_dataset, # 学習データセット
    eval_dataset=val_dataset, # 訓練データセット
)
model.config.use_cache = False

# 学習の実行
trainer.train()
```

データ量が少ないので、だいたい10分ほどで完了しました。
学習が完了したら、このモデルを保存します。

```python
# 学習モデルの保存
peft_model_id="lora_results"
trainer.model.save_pretrained(peft_model_id)
tokenizer.save_pretrained(peft_model_id)
```

これでファインチューニングが完了しました。
最後に学習させたモデルの検証をしていきたいと思います。

# 雑談対話モデルの検証
それでは学習させた雑談対話モデルを検証していきましょう。

## 学習モデルの読み込み
まず学習させたモデルを読み込んでいきます。

```python
import torch
from peft import PeftModel, PeftConfig
from transformers import AutoModelForCausalLM, AutoTokenizer

peft_model_id = "lora_results"
config = PeftConfig.from_pretrained(peft_model_id)

# ベースモデルの準備
base_model = AutoModelForCausalLM.from_pretrained(
	config.base_model_name_or_path,
	load_in_8bit=True,
	device_map="auto")
tokenizer = AutoTokenizer.from_pretrained(config.base_model_name_or_path)

# LoRAモデルのロード
model = PeftModel.from_pretrained(
	base_model,
	peft_model_id,
	state_dict=base_model.state_dict(),
	device_map="auto",
	torch_dtype=torch.float16)
model.eval()
```

## プロンプトテンプレートの準備
次に検証用にレスポンス内容なしのプロンプトテンプレートを定義します。

```python
# プロンプトテンプレートの準備
def generate_prompt(data_point):
    if data_point["input"]:
        result = f"""### 指示:
{data_point["instruction"]}

### 入力:
{data_point["input"]}

### 回答:
"""
    else:
        result = f"""### 指示:
{data_point["instruction"]}

### 回答:
"""

  # 改行→<NL>
  result = result.replace('\n', '<NL>')
  return result
```

## テキスト生成関数の定義
テキストを生成する関数を作成します。

```python
# テキスト生成関数の定義
def generate(instruction,input=None,maxTokens=256):
    # 推論
    prompt = generate_prompt({'instruction':instruction,'input':input})
    input_ids = tokenizer(prompt,
        return_tensors="pt",
        truncation=True,
        add_special_tokens=False).input_ids.cuda()
    outputs = model.generate(
        input_ids=input_ids,
        max_new_tokens=maxTokens,
        do_sample=True,
        temperature=0.7,
        top_p=0.75,
        top_k=40,
        no_repeat_ngram_size=2,
    )
    outputs = outputs[0].tolist()
    print(tokenizer.decode(outputs))

    # EOSトークンにヒットしたらデコード完了
    if tokenizer.eos_token_id in outputs:
        eos_index = outputs.index(tokenizer.eos_token_id)
        decoded = tokenizer.decode(outputs[:eos_index])

        # レスポンス内容のみ抽出
        sentinel = "### 回答:"
        sentinelLoc = decoded.find(sentinel)
        if sentinelLoc >= 0:
            result = decoded[sentinelLoc+len(sentinel):]
            print(result.replace("<NL>", "\n"))  # <NL>→改行
        else:
            print('Warning: Expected prompt template to be emitted.  Ignoring output.')
    else:
        print('Warning: no <eos> detected ignoring output')
```

## 推論の実行
以下のスクリプトを実行して雑談対話モデルを起動してみましょう。

```python
while True:
    user_input = input()
    if user_input == "quit":
      print("会話を終了します。")
      break

    generate(user_input)
```

```bash
> こんにちは
うん。</NN>
> うん
まあ、でも、それで、もうちょっと、なんか、あの、いろいろ考えて、どうしようかなって思って。
> 今日は暑いねー
うん。<回答NN>
> 熱くない？
ちょっと。<回答者>
> そうだよね
あー、でも、そういうのもね、私が、なんか、その、こう、あの、ちょっと、まあ、うん、ああいうのが好きなんだけど、みたいなこと言ったら、じゃあそうしようって。<回答>
```
「>」の後が、私が書いた部分となります。
精度としてはあまり高くはないかもしれませんが、友達と雑談しているような適当な返しになりましたね（笑）

# まとめ
今回は大規模言語モデルRinna-3.6Bに名大会話コーパスを学習させて雑談対話モデルを作成しました。
学習量が足りないのか精度としてはそれほど高くはありませんが、ファインチューニング前と比べるとかなり雑談しているような返しになったのではないでしょうか。
今後も学習を繰り返していけばより精度の高いモデルも出来そうな気がします。
また名大会話コーパスには複数人での会話もありましたのでそれを学習させて、あたかも複数人で話しているかのような対話モデルを作るのも面白そうですね。
他の大規模言語モデルの学習も興味深いです。もしかしたらRinna-3.6Bとは違った結果が返ってくるのかもしれません。
更にこのブログを書いている時に知ったのですが、[青空文庫](https://www.aozora.gr.jp/)には戯曲のデータ、[落語はろー](http://www.asahi-net.or.jp/~ee4y-nsn/rakugo/00main.htm)には落語のデータがあるそうです。
戯曲や落語は会話の学習にはうってつけですので、それらを学習させてみて比較するのも面白そうです。
色々と試しようがあるので、これからも少しずつ実験をしていこうと思います。

# 参考
- 今回使用した大規模言語モデル
	- [Rinna-3.6B:japanese-gpt-neox-3.6b-instruction-ppo](https://huggingface.co/rinna/japanese-gpt-neox-3.6b-instruction-ppo)
- 学習データ
  - [名大会話コーパス](https://mmsrv.ninjal.ac.jp/nucc/)
  - 文献
藤村逸子・大曽美恵子・大島ディヴィッド義和、2011
「会話コーパスの構築によるコミュニケーション研究」
藤村逸子、滝沢直宏編『言語研究の技法：データの収集と分析』p. 43-72、ひつじ書房

- [rinna、日本語に特化した36億パラメータのGPT言語モデルを公開](https://prtimes.jp/main/html/rd/p/000000042.000070041.html)
- [rinna、人間の評価を利用したGPT言語モデルの強化学習に成功](https://prtimes.jp/main/html/rd/p/000000043.000070041.html)
- [相当凄いぞ！！「Rinna製GPT-NEOX-3.6b」を使い対話型の文章生成する方法＆精度検証](https://economylife.net/gpt-neox-3-6b-instruction-sft/)
- [LLMを効率的に再学習する手法(PEFT)を解説](https://blog.brainpad.co.jp/entry/2023/05/22/153000)
- [Google Colab で Rinna-3.6B のLoRAファインチューニングを試す](https://note.com/npaka/n/nc387b639e50e)
- [Google Colab で PEFT による大規模言語モデルのファインチューニングを試す](https://note.com/npaka/n/n932b4c0a2230)
- [自分の過去ツイートでrinna/japanese-gpt-neox-3.6bをfinetuningして「俺tter」を生成する](https://note.com/eurekachan/n/n899132477dff)
- [自然言語処理初心者が「GPT2-japanese」で遊んでみた](/blogs/2022/07/08/gpt-2-japanese/)

[^footnote_api_service]:私が知っている中ではAI検索エンジンや小説の続きを書いてくれるサービス、マンガ制作の支援サービスなど様々！このサイトに登場する豆香ちゃんもコラムを書いてくれていますね！([豆香の豆知識](/gpt/mameka/))