---
title: 大規模言語モデル初心者がハリーポッター対話モデルを作ってみた
author: yuma-takao
date: 2023-10-06
tags: [自然言語処理, 機械学習, ファインチューニング]
---

# はじめに
ChatGPTの普及により、文章生成技術がますます身近になっています。
ChatGPTをはじめとする生成系AIは、巨大なテキストデータセットから学習した大規模言語モデル（LLM）をベースとしています。
このLLMは、ファインチューニングによってカスタマイズ可能で、特定の領域に特化したモデルを作成できます。

私はLLM初心者でしたが、ファインチューニングを試してみたいと思っていました。
LLMについて調べつつ、扱いやすそうなデータがないか探していたところ、小説ハリーポッターのデータセットを見つけました。
（特別ハリーポッター好きというわけではありませんが、金曜ロードショーでやっていれば見ます）

そこで今回は、ハリーポッター風の回答をするモデルの作成に挑戦しました。

# 学習データとモデルについて
## 学習データ
香港科技大学（The Hong Kong University of Science and Technology：HKUST）による、
英語・中国語のハリーポッターの小説から作成された、シーンごとの登場人物の会話のデータセットです。
会話の内容だけでなく、そのシーンの前提情報、登場人物同士の関係性などもデータセットに組み込まれています。

[Harry-Potter-Dialogue-Dataset](https://github.com/nuochenpku/Harry-Potter-Dialogue-Dataset)

## モデル
Google Colabでも動かせる程度に軽量で、英語で学習されているモデルから、bigscience/bloomz-1b1　を使ってみることにしました。

[bigscience/bloomz-1b1](https://huggingface.co/bigscience/bloomz-1b1)

# bloomz-1b1のファインチューニング
## 実行環境
Google Colab無料版（T4 GPUを使用）

## 必要なライブラリーを取得
ここからは実際のプログラムになります。
```python
# https://www.philschmid.de/fine-tune-flan-t5-peft
# install Hugging Face Libraries
!pip install "peft==0.2.0"
!pip install "transformers==4.29.0" "datasets==2.9.0" "accelerate==0.17.1" "evaluate==0.4.0" "bitsandbytes==0.37.1" loralib --upgrade --quiet
# install additional dependencies needed for training
!pip install rouge-score tensorboard py7zr
```

## モデルのロード
bigscience/bloomz-1b1モデルの使用方法に従って、モデルをロードします。

```python
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

checkpoint = "bigscience/bloomz-1b1"

tokenizer = AutoTokenizer.from_pretrained(checkpoint)
model = AutoModelForCausalLM.from_pretrained(
        checkpoint,
        torch_dtype="auto",
        device_map="auto")

if torch.cuda.is_available():
    model = model.to("cuda")
```

### 学習前のモデルの動作確認
シンプルで短めな回答が返ってくる印象でした。
ハリーポッターが何者なのかは知っているようです。

```python
入力：　Who is Harry Potter?
出力：　a wizard # 魔法使い

入力：　Harry, I can't tell you how pleased I am to meet you.
出力：　I have been looking for you.

入力：　Tell me some secret of the Hogwarts School.
出力：　回答なし
```

## データセットの加工
香港科技大学の小説ハリーポッターのデータセットは、以下のようになっています（一部抜粋）。
今回は、会話が行われている場面の説明「scene」と、会話内容「dialogue」を使用して学習データを作成しました。
```python
# 元データ（一部）
"Session-16": {
        "position": "Book1-chapter5",
        "speakers": [
            "Harry",
            "Hagrid"
        ],
        "scene": "In Flourish and Blotts, Harry and Hagrid buy Harry's school books. Harry is fascinated by the books full of peculiar symbols and curses. Hagrid reminds Harry that he is not allowed to use magic in the Muggle world. They also visit the Apothecary where Harry examines potion ingredients and Hagrid promises to buy him an owl as a birthday present.",
        "dialogue": [
            "Harry: I was trying to find out how to curse Dudley.",
            "Hagrid: I’m not sayin’ that’s not a good idea, but yer not ter use magic in the Muggle world except in very special circumstances, An’ anyway, yeh couldn’ work any of them curses yet, yeh’ll need a lot more study before yeh get ter that level. Oh,",
            "Harry: You don’t have to —"
        ],
```


データセットはGoogleドライブに配置したものへアクセスしています。
[Google ドライブにマウントし、ファイルへアクセスする方法](https://blog.kikagaku.co.jp/google-colab-drive-mount)

```python
import json

harry = 'Harry'
data = []

with open('en_train_set.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

for j in range(50):
  j += 1
  session = "Session-" + str(j)
  dialogs = d[session]['dialogue']

  for i in range(len(dialogs) - 1):
    if i == range(len(dialogs) - 2):
      continue

    speaker = dialogs[i].split(':')[0]
    dialog = dialogs[i].split(':')[1]

    nextSpeaker = dialogs[i + 1].split(':')[0]
    nextDialog = dialogs[i + 1].split(':')[1]

    if speaker != harry and nextSpeaker == harry:
      data.append({
        'input': dialog,
        'output': nextDialog
      })

  # 会話シーンの背景情報
  scene = d[session]['scene']
  fixed_input = 'Tell me the background information of the Harry Potter.'
  data.append({
        'input': fixed_input,
        'output': scene
      })
```
「dialogue」から、Harryの発言がoutput、その前の話者の発言がinputとなるようにデータを加工していきます。
さらに、ハリーポッターや会話が行われている場面の状況を学習させるために、「scene」のデータも学習データとしました。
Google Colabでの動作環境を考慮し、会話内容とその場面の説明を合わせて173件のデータを使用しました。
```python
# 学習に使用するデータ（一部）

# 会話内容
{'input': ' Get out, both of you,',
 'output': ' I WANT MY LETTER!'},
# 会話場面の説明
{'input': 'Tell me the background information of the Harry Potter.',
 'output': 'In this scene, Harry is asked to get the mail by his uncle, but Dudley is instructed to make Harry get it. Harry finds a letter addressed to him, which surprises him since he has never received a letter before. The envelope is thick and heavy, made of yellowish parchment, and the address is written in emerald-green ink. The letter is taken away by Uncle Vernon, who turns pale after reading it, and Harry is kicked out of the room.'},
...
```

## プロンプトテンプレートの準備
出力形式を定義します。

```python
def generate_prompt(data_point):
    result = f"""### 指示:
{data_point["input"]}

### 回答:
{data_point["output"]}
"""
    # 改行→<NL>
    result = result.replace('\n', '<NL>')
    return result

print(generate_prompt(data[0]))
# ### 指示:<NL> Up! Get up! Now! Up! Up! Are you up yet?<NL><NL>### 回答:<NL> Nearly,<NL>
```

## トークナイズ関数の定義
トークナイズ関数を定義します。

```python
CUTOFF_LEN = 256  # コンテキスト長

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
tokenize("hi there", tokenizer) # {'input_ids': [2807, 2782], 'attention_mask': [1, 1]}
```

## 学習データと検証データの準備
学習データと検証データをそれぞれ準備します。
```python
VAL_SET_SIZE = 1000

train_dataset = []
val_dataset = []

for i in range(len(data)):
  if i % 5 == 0:
      x = tokenize(generate_prompt(data[i]), tokenizer)
      val_dataset.append(x)
  else:
      x = tokenize(generate_prompt(data[i]), tokenizer)
      train_dataset.append(x)
```

## ファインチューニング

### LoRAモデルの準備
LoRAモデルの設定をします。
```python
from peft import LoraConfig, get_peft_model, prepare_model_for_int8_training, TaskType

# LoRAのパラメータ
lora_config = LoraConfig(
    r= 8,
    lora_alpha=16,
    target_modules=["query_key_value"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)

# モデルの前処理
model = prepare_model_for_int8_training(model)

# LoRAモデルの準備
model = get_peft_model(model, lora_config)

# 学習可能パラメータの確認
model.print_trainable_parameters()
```

### ファインチューニングの実行
LoRAモデルに対して、ファインチューニングを行います。
```python
from torch.cuda import amp
from transformers import Trainer, TrainingArguments
from transformers import DataCollatorForLanguageModeling

# モデルをGPU上で単精度浮動小数点数に変換
model = model.float()

output_dir="./results/output_results"

data_collator = DataCollatorForLanguageModeling(tokenizer, mlm=False)

training_args = TrainingArguments(
    output_dir=output_dir,
    auto_find_batch_size=True,
    learning_rate=1e-4,
    num_train_epochs=3,
    logging_dir=f"{output_dir}/logs",
    logging_strategy="steps",
    logging_steps=20,
    save_strategy="no",
    report_to="tensorboard",
    evaluation_strategy="steps",
    eval_steps=200,
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
trainer.train() # 約2分で学習完了
```
<br>
約2分で学習が完了しました。
<br>学習済みモデルを保存します。

```python
peft_model_id="lora_results"
trainer.model.save_pretrained(peft_model_id)
tokenizer.save_pretrained(peft_model_id)
```

## 学習モデルの読み込み
保存した学習モデルを読み込みます。

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

# 評価モード
model.eval()
```

## 回答動作の設定
### プロンプトテンプレートの準備
回答用の出力形式を定義します。
```python
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
### テキスト生成関数の定義
テキスト生成関数を定義します。
```python
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


# ハリーポッターモデルの検証
日本語で出力することも検討しましたが、Google翻訳等のツールでは、かしこまった日本語になってしまうため、英語のままにしました（勝手な和訳は添えてあります…）。

結果は、想像していたよりも自然なやり取りになっていました。
ハリーポッターのストーリーに沿っていたり、沿っていなかったりですが、登場人物や場所などの固有名詞も認識してくれているようでした。
ハリーとその他人物との会話内容だけでなく、会話場面の状況描写「scene」を学習データとして与えてあげた効果かなと感じました。

以下、今回作成したハリーポッターモデルからの返答の一部です。
<br>

```python
入力：　Who are you?
ハリー：　I'm a doctor.
```
ハリーは医者になりました。
<br>
```python
入力：　Oh, hello, Harry, Excellent flying yesterday, really excellent.
       Gryffindor has just taken the lead for the House Cup — you earned fifty points!
　　　　（やあハリー、昨日の試合は見事だったね。
         君が50点取ってくれて、グリフィンドールがついにハウスカップで首位に立ったね！）
ハリー：　Yes, thank you, Mr. Weasley.
　　　　（ありがとう、ウィーズリー）
```
ウィーズリー（ロン・ウィーズリー？）から話しかけられたような回答になりました。
ストーリーの前提情報が学習された成果でしょうか。
<br>
```python
入力：　Tell me some secret of the Hogwarts School.
　　　　（何かホグワーツの秘密を教えて）
ハリー：　I am the wizard of Hogwarts.
　　　　（僕はホグワーツの魔法使いだ）
```
一般的な会話としては成立していますが、「秘密」ではないですね…

# まとめ
今回は小説ハリーポッターのデータセットを用いて、ハリーポッター風の回答をするモデルを作成してみました。
<br>一般的な回答をすることも多く、回答の精度としてはまだまだですが、ハリーポッターっぽさもみられ、ある程度学習の成果はあったと思える結果でした。
学習データの選定・加工、大規模言語モデルの選択などで課題が見つかったので、今後も改良に努めていきたいと思います。


# 参考
- データセット：　[Harry-Potter-Dialogue-Dataset](https://github.com/nuochenpku/Harry-Potter-Dialogue-Dataset)
- 使用したモデル：　[bigscience/bloomz-1b1](https://huggingface.co/bigscience/bloomz-1b1)
- [Google Colab で Rinna-3.6B のLoRAファインチューニングを試す](https://note.com/npaka/n/nc387b639e50e)