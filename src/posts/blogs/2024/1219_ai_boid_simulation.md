---
title: ローカルLLMを使ったボイドシミュレーション（llama.cpp、llama-cpp-python）
author: takafumi-okubo
date: 2024-12-19
summerRelayUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
tags: [advent2024, Python, PyGame, ボイド, シミュレーション, 生成AI, LLM, AI]
image: true
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2024](/events/advent-calendar/2024/)第19日目の記事です。

# はじめに
こんにちは。[前回](/blogs/2024/08/21/boid_life_simulation/)、[前々回](/blogs/2024/03/15/pygame_boid/)に引き続き、PyGameを使って遊び……もといシミュレーションをしている大久保です。
今回は、昨今発展が著しい生成AIの分野を組み合わせてボイドモデルのシミュレーションしてみました。

「生成AIを使うってことは、高いGPUを買ったり、どっかに課金してAPIを使うんでしょう？」
と思われるかもしれませんが、実はローカルPC（CPU）でも出来ちゃったりするんです。
そこで今回は、オープンソースのLLMを使ってローカルのノートパソコン（Windows11）上でのシミュレーションをご紹介したいと思います。

具体的には、`llama-cpp-python`というライブラリを用いて量子化されたLLMで、ボイドモデルを動かしてみました。
![](https://i.gyazo.com/e544ecfe2e42c323f5935b09c5881229.gif)

ローカルLLMによる出力時、多少フリーズしてしまいますが、生成された指示に合わせて動いてくれます。
試行錯誤の末にたどり着いた方法なので、お見苦しい点もあるかもしれませんが、気になった方は最後まで読んでいただけますと嬉しいです。

今回の記事では、まずローカルLLMの選定をします。できるだけ負荷が低くCPUでもスムーズに動かせるくらいのモデルを探しました。
その際に`llama-cpp-python`というライブラリを使いましたので、簡単に紹介します。
その次に今回シミュレーションで動かしたボイドモデルの実装方法を議論して、最後に結果をまとめます。

ソースコードは[GitHub](https://github.com/TakOkubo/ai_boid_simulation)でも公開していますので、ぜひそちらも見ていただければ幸いです。

# ローカルLLMの選定
## モデルの候補
それでは早速、ローカルLLMをシミュレーションに使うにあたって、モデルの選定をしていきたいと思います。
今回はノートパソコン上でのシミュレーションを考えていますので、軽量かつCPUで動かせるモデルを探します。
入力に対して動きの指示ができれば良いので、精度はそれなりのものを選定します。

その中で下記モデルを候補に上げました。
・[Gemma-2-2b-it](https://huggingface.co/google/gemma-2-2b-it)
・[Llama-3.2-1B-Instruct](https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct)

Gemma2はGoogleが開発した軽量かつ高性能なオープンソースLLMです。
2bというのはパラメータのサイズが20億でGemma2の中では一番軽量です。またitというのは指示学習モデルのことを指しています。指示学習モデルとは、ChatGPTのように人間の指示に応じた回答が可能なモデルのことだと思っていただければこの記事では大丈夫です！

一方、LLaMA3はMeta社が開発したオープンソースLLMです。
こちらも、最新ということもあり、かなり高性能なモデルになっています。LLaMA3ではスマートフォンでの利用を目指しパラメータを小さくした軽量モデルとして、1Bと3Bがあります。今回はその中で最も軽量な1Bを利用します。またGemma2と同じようにInstructは指示学習モデルのことを指しています。

実際にこちらのモデルを使ってみましょう。CPUで使うことを想定していますので、対象のモデルをHugging Faceからダウンロードし使用してみました。

modelというディレクトリの中にダウンロードしたモデルを入れ、下記のソースコードを実行してみます。
``` python
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import time

model_id = "model/google/gemma-2-2b-it"
# model_id = "model/meta-llama/Llama-3.2-1B-Instruct"

def main():
	start_time_1 = time.time()

	# モデルとトークナイザーのロード
	tokenizer = AutoTokenizer.from_pretrained(model_id)
	model = AutoModelForCausalLM.from_pretrained(
		model_id,
		device_map = "cpu",
	)

	end_time_1 = time.time()
	print("------------------------------")
	print("モデルロード時間　", end_time_1 - start_time_1)
	print("------------------------------")

	start_time_2 = time.time()

	prompt = [
		{
			"role": "user",
			"content": "Please explain machine learning."
		}
	]

	inputs = tokenizer.apply_chat_template(
		prompt, 
		return_tensors="pt", 
		add_generation_prompt=True, 
		return_dict=True
	).to("cpu")

	outputs = model.generate(
		**inputs, 
		max_new_tokens=256)
	generated_text = tokenizer.batch_decode(outputs[:, inputs['input_ids'].shape[1]:], skip_special_tokens=True)[0]
	print(generated_text.strip())

	end_time_2 = time.time()
	print("------------------------------")
	print("回答時間　", end_time_2 - start_time_2)
	print("------------------------------")

if __name__ == '__main__':
	main()
```

### 実行結果
```log:Gemma2の実行結果
------------------------------
モデルロード時間　 25.756981372833252
------------------------------
## Machine Learning: Teaching Computers to Learn

Imagine teaching a dog a new trick. You show them what to do, reward them when they get it right, and correct them when they make mistakes. Over time, the dog learns the trick.   

Machine learning is similar. Instead of a dog, we have a computer, and instead of a trick, we have a task. We feed the computer a lot of data, and it learns to identify patterns and make predictions based on that data.

**Here's a breakdown:**

**1. Data:** The foundation of machine learning is data. This can be anything from images and text to numbers and sensor readings. The more data you have, the better your machine learning model will perform.

**2. Algorithms:** These are the "recipes" that tell the computer how to learn from the data. There are many different types of algorithms, each suited for different tasks. Some common ones include:

* **Supervised learning:** The algorithm is trained on labeled data, meaning each data point has a known outcome. It learns to predict the outcome for new, unseen data. Examples: image classification, spam detection.
* **Unsupervised learning:** The algorithm is trained on unlabeled data. It
------------------------------
回答時間　 197.1345989704132
------------------------------
```

```log:LLaMA3の実行結果
------------------------------
モデルロード時間　 5.21970796585083
------------------------------
Setting `pad_token_id` to `eos_token_id`:None for open-end generation.
Machine learning is a subfield of artificial intelligence (AI) that involves training algorithms to learn from data and make predictions or decisions without being explicitly programmed. The goal of machine learning is to enable computers to improve their performance on a task over time, based on the data they have been trained on.

There are several key concepts in machine learning:

1. **Data**: Machine learning requires a large amount of data to train the algorithms. This data can be in the form of images, text, audio, or other types of data.
2. **Algorithms**: Machine learning algorithms are the building blocks of machine learning. These algorithms can be used to classify data, make predictions, or take actions based on the data.
3. **Training**: Training is the process of feeding the data to the algorithm and adjusting its parameters to make it more accurate. The goal of training is to minimize the error between the predicted and actual outputs.
4. **Model**: A model is a mathematical representation of the algorithm that can be used to make predictions or decisions. The model is trained on the data and can be used to classify new data or make predictions.
5. **Evaluation**: Evaluation is the process of assessing the performance of the model. This can be done using metrics such as accuracy, precision
------------------------------
回答時間　 38.5177276134491
------------------------------
```

outputのトークン数が`max_new_tokens=256` のため回答がどちらも途中で切れてしまっていますが、精度としてはどちらも申し分ないです。
どちらかというと、Gemmaの方がユーモアあって面白いですね。

しかしモデルのロード時間と回答時間をまとめると下記のようになります。
<style>
.model_table table {
    width: 80%;
    margin:  auto; 
}
</style>

<div class="model_table">

| モデル | ロード時間 | 回答時間 |
| --- | --- | --- | 
| Gemma-2-2b-it | 約25.8秒 | 約197秒 |
| Llama-3.2-1B-Instruct | 約5.21秒 | 約38.5秒 |

</div>

うーん……思ったより遅い……。
LLaMA-3.2-1Bでも回答時間が38.5秒とかかるので、これを使ってシミュレーションするのは結構無理がありそう。
CPUも、特にGemma2では、かなり重くなってしまいました。
![](https://i.gyazo.com/e052711a3d4a85a05853992e81263814.jpg)

回答時間がもう少し早くなり、負荷がもっと少なくなってくれるとスムーズにシミュレーションできそうです。

## llama.cppを使う
ということでこれ以上、もう少し軽量なモデルを探していたところ、ローカルで動かせるLLMのライブラリがあることを知りました。
その名も「llama.cpp」です。
このライブラリは2～8ビット整数で量子化されたモデルをCPUでも実行できるライブラリです。
「llama」という名前がついていることから、LLaMAモデルが使えるのはもちろんのこと、GGUF形式であればLLaMA以外のLLMも使えます。

Python用のライブラリとして、`llama-cpp-python` というのもあるので早速インストールして使ってみましょう。
```
pip install llama-cpp-python
```
GemmaやLLaMAなどのLLMを量子化しGGUF形式に変換したモデルもHugging Faceにあり、下記リンクからダウンロードできます。

- Gemma2
	- [https://huggingface.co/mmnga/gemma-2b-it-gguf](https://huggingface.co/mmnga/gemma-2b-it-gguf)
	- 使用モデル：gemma-2-2b-it-Q4_K_M.gguf
- LLaMA3
	- [https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF](https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF)
	- 使用モデル：Llama-3.2-1B-Instruct-Q4_K_M.gguf

さっきと同じようにmodelというディレクトリの中にダウンロードしたモデルを入れ、下記のソースコードを実行してみます。
```python
from llama_cpp import Llama
import time

model_path = "./model/mmnga/gemma-2-2b-it-gguf/gemma-2-2b-it-Q4_K_M.gguf"
chat_format = "gemma"

# model_path = "./model/bartowski/Llama-3.2-1B-Instruct-GGUF/Llama-3.2-1B-Instruct-Q4_K_M.gguf"
# chat_format = "llama-3"
def main():
	start_time_1 = time.time()

	# モデルとトークナイザーのロード
	llm = Llama(
		model_path=model_path, 
		chat_format=chat_format,
		n_gpu_layers=-1, 
		n_ctx=512
	)

	end_time_1 = time.time()
	print("------------------------------")
	print("モデルロード時間　", end_time_1 - start_time_1)
	print("------------------------------")

	start_time_2 = time.time()

	prompt = [
		{
			"role": "user",
			"content": "Please explain machine learning."
		}
	]

	outputs = llm.create_chat_completion(
		messages=prompt, 
		max_tokens=256,
		temperature=0.7
	)
	print("------------------------------")
	print(outputs["choices"][0]["message"]["content"])
	print("------------------------------")

	end_time_2 = time.time()
	print("------------------------------")
	print("回答時間　", end_time_2 - start_time_2)
	print("------------------------------")

if __name__ == '__main__':
	main()
```


### 実行結果
```log:Gemma2の量子化バージョンの実行結果
～～～略～～～
------------------------------
モデルロード時間　 0.5315546989440918
------------------------------
llama_perf_context_print:        load time =     451.43 ms
llama_perf_context_print: prompt eval time =       0.00 ms /    14 tokens (    0.00 ms per token,      inf tokens per second)
llama_perf_context_print:        eval time =       0.00 ms /   255 runs   (    0.00 ms per token,      inf tokens per second)
llama_perf_context_print:       total time =   13714.50 ms /   269 tokens
------------------------------
Imagine you're teaching a dog a new trick. You show it what to do, reward it when it gets close, and correct it when it makes a mistake. Over time, the dog learns the trick. 

Machine learning is a bit like that, but instead of a dog, we have a computer program.

**Here's the basic idea:**

* **Data is the key:** Machine learning algorithms learn from data. The more data they receive, the better they become at their tasks.
* **Algorithms learn patterns:**  These algorithms are like mini-brains that process data and find patterns.
* **Predictions and improvement:** The algorithms use these patterns to make predictions about new, unseen data.  They can also learn and improve their performance over time.

**Here's a breakdown of the main types of machine learning:**

**1. Supervised Learning:**
* **Humans provide labelled data:** Think of it like teaching the dog with pictures labeled "good dog" or "bad dog."
* **Algorithms learn the relationship:** The algorithm learns the relationship between input features (like the dog's posture) and the corresponding output (is it a good or bad dog).
* **Examples:** Predicting house
------------------------------
------------------------------
回答時間　 13.719425916671753
------------------------------
```

```log:LLaMA3の量子化バージョンの実行結果
～～～略～～～
------------------------------
モデルロード時間　 0.8961973190307617
------------------------------
llama_perf_context_print:        load time =     223.75 ms
llama_perf_context_print: prompt eval time =       0.00 ms /    15 tokens (    0.00 ms per token,      inf tokens per second)
llama_perf_context_print:        eval time =       0.00 ms /   255 runs   (    0.00 ms per token,      inf tokens per second)
llama_perf_context_print:       total time =    6303.49 ms /   270 tokens
------------------------------
Machine learning! It's a fascinating field that has revolutionized the way we approach data analysis, decision-making, and problem-solving. I'd be happy to explain machine learning in simple terms.

**What is Machine Learning?**

Machine learning is a subset of artificial intelligence (AI) that involves training algorithms to learn from data, make predictions, or take actions without being explicitly programmed. It's a type of statistical learning that enables computers to improve their performance on a task over time, based on data.       

**Key Concepts:**

1. **Supervised Learning:** The goal is to teach a model to learn from labeled data, where the correct output is already known.
2. **Unsupervised Learning:** The goal is to identify patterns or structure in unlabeled data.
3. **Reinforcement Learning:** The goal is to train a model to make decisions based on feedback from rewards or penalties.

**How Machine Learning Works:**

1. **Data Collection:** Gather a large dataset, which can be in the form of images, text, audio, or any other type of data.
2. **Data Preprocessing:** Clean, transform, and normalize the data to prepare it for analysis.
3. **Model Selection:** Choose a suitable algorithm, such as linear regression, decision
------------------------------
------------------------------
回答時間　 6.306737899780273
------------------------------
```

さっきと同じようにoutputのトークン数が`max_tokens=256` のため回答がどちらも途中で切れてしまっていますが、精度としてはどちらも申し分ないです。
というかそんなに変わらない気がします！

またモデルのロード時間と回答時間もまとめると下記のようになります。
<div class="model_table">

| モデル | ロード時間 | 回答時間 |
| --- | --- | --- | 
| Gemma-2-2b-it | 約0.531秒 | 約13.7秒 |
| Llama-3.2-1B-Instruct | 約0.896秒 | 約6.30秒 |

</div>

圧倒的な早さ！
理想的にはコンマ何秒くらいがよかったのですが、負荷がかからず精度もそれなりでこれくらいの早さならば、シミュレーションで使っても問題なさそうです。
そのため、今回は一番早い「Llama-3.2-1B-Instruct」を使ってシミュレーションしてみようと思います。

# シミュレーション
## 下準備（ボイド、餌、敵のモデルの作成）
それでは早速、PyGameによるシミュレーションを作成していきましょう。
今回の目的は、ローカルLLMによって生成された指示に従って動くボイドモデルを作ることです。
シミュレーションの流れとしては下記を想定しています。

1. シミュレーションが始まると、餌と敵、ボイドが配置される。
2. ボイドが餌と敵の位置情報を取得する。
3. 餌と敵の位置情報をローカルLLMに入力する。
4. その情報を元にローカルLLMがボイドの動きを生成する。
5. 生成された指示に従ってボイドが動く。
6. クリア条件：配置された餌を全て食べる。ゲームオーバー条件：ボイドのHPが0になる。

以上の流れを実現するための下準備として、ボイドモデル（bird.py）とmain.pyを作成していきたいと思います。

### ボイドモデルの作成
```python:bird.py
import pygame
import random
import json
import numpy as np

BIRD_COLORS = [
	'#FFA5CC',  # pink
	'#80FF25',  # green
	'#A0D4FF',  # skyblue
]

# HP
HEALTH_POINT = 500

# 鳥モデル
class Bird:
	def __init__(self,
			bird_id,
			width,
			height
	):
		self.bird_id = bird_id
		self.width = width
		self.height = height
		# 位置
		self.position = np.array([random.uniform(0, width), random.uniform(0, height)])
		# 速度と角度
		self.velocity = 0.0
		self.angle = np.radians(0)
		self.direction = np.array([np.cos(self.angle), np.sin(self.angle)])
		# 鳥のHP
		self.health_point = HEALTH_POINT
		# 鳥の形状
		self.polygon = np.array([(20, 0), (0, 5), (0, -5)])
		self.type_id = self.bird_id % 3
		self.color = BIRD_COLORS[self.type_id]

	# 行動
	def move(self):
		self.direction = np.array([np.cos(self.angle), np.sin(self.angle)])
		# 速度ベクトルから進行方向を求める。
		vector = self.velocity * (self.direction)
		if np.linalg.norm(vector) != 0:
			self.position += vector

		# 鳥が壁にぶつかったら反対側に通り抜ける
		if self.position[0] > self.width or self.position[0] < 0:
			self.position[0] = np.abs(self.position[0] - self.width)
		if self.position[1] > self.height or self.position[1] < 0:
			self.position[1] = np.abs(self.position[1] - self.height)

	def display(self, screen):
		# 回転行列を形成
		rotation_matrix = np.array([[np.cos(self.angle), -np.sin(self.angle)],
									[np.sin(self.angle), np.cos(self.angle)]])
		# 頭を進行方向にするように回転させる。
		rotated_polygon = np.dot(self.polygon, rotation_matrix.T) + self.position
		pygame.draw.polygon(screen, self.color, rotated_polygon, 0)

```

ボイドモデルの初期値ではHPや初期位置、初期速度や角度を定義しています。
そして`move()`メソッドで速度や角度に従ってボイドが動くようになります。

### 餌や敵モデルの作成
次に餌や敵のモデルを作成します。
・餌（food.py）：食べると、ボイドのHPが増えるオブジェクト（動かない）
・敵（enemy.py）：当たると、ボイドのHPが減るオブジェクト（動かない）

今回は簡単のため、餌と敵は動かさない簡易的なシミュレーションを作成します。

```python:food.py
import pygame

FOOD_POWER = 150
RADIUS_OF_FOOD = 10

# 餌
class Food:
	def __init__(self, x, y, food_power=FOOD_POWER):
		self.x = x
		self.y = y
		self.power = food_power
		self.radius = RADIUS_OF_FOOD
		self.eaten = False

	def move(self):
		pass

	def display(self, screen):
		pygame.draw.circle(screen, (0, 0, 255), (int(self.x), int(self.y)), self.radius)
```

```python:enemy.py
import pygame

ENEMY_POWER = 250
RADIUS_OF_ENEMY = 10

# 敵
class Enemy:
	def __init__(self, x, y, enemy_power=ENEMY_POWER):
		self.x = x
		self.y = y
		self.power = enemy_power
		self.radius = RADIUS_OF_ENEMY
		self.clashed = False

	def move(self):
		pass

	def display(self, screen):
		pygame.draw.rect(screen, (255, 0, 0), (int(self.x), int(self.y), self.radius * 2, self.radius * 2))
```

餌や敵にあるPOWERはそれぞれ彼らが持っている力だと思ってください。
餌の場合、ボイドが餌に当たった時、POWER分、HPが回復します。
敵の場合、ボイドが敵に当たった時、POWER分、HPが減少します。
RADIUSは餌や敵の大きさ、つまり当たり判定される半径のことです。

以上を元に、ボイドモデルには餌や敵の探索や食事などのルールを追加します。
```python:bird.py
# 鳥モデル
class Bird:
	def __init__(self,
			bird_id,
			width,
			height,
			ai_model
	):
		#
		# 省略
		#
		# 初期値
		self.food_param = RADIUS_OF_FOOD
		self.food_positions = []
		self.enemy_param = RADIUS_OF_ENEMY
		self.enemy_positions = []

	#
	# 省略
	#
	# 餌の探索ルール
	def search_food(self, food_list):
		# 探索範囲
		radius = self.food_param
		# 自分の位置
		x = self.position[0]
		y = self.position[1]

		# 鳥の近くにある餌を取得する。
		near_food = [food for food in food_list
			if np.linalg.norm(np.array([food.x, food.y]) - np.array([x, y])) < radius
				and not food.eaten
		]

		# 鳥と餌の相対位置を計算する。
		relative_food_positions = []
		if len(near_food) > 0 :
			for food in near_food:
				food_position = np.array([food.x, food.y]) - np.array([x, y])

				# 極座標変換
				r = np.linalg.norm(food_position)
				theta = np.degrees(np.arctan2(food_position[1], food_position[0]))

				relative_food_positions.append({
						"angle" : theta,
						"distance" : r
				})
		self.food_positions = relative_food_positions
	
	# 食事ルール
	def eat_food(self, food_list):
		# 餌を食べる
		x = self.position[0]
		y = self.position[1]

		# 鳥の近くにある餌を取得する。
		near_foods = [food for food in food_list
			if np.linalg.norm(np.array([food.x, food.y]) - np.array([x, y])) < food.radius
				and not food.eaten
		]

		# 餌がある場合、食べる。
		if len(near_foods) > 0:
			first_near_food = near_foods[0]
			self.health_point += first_near_food.power
			first_near_food.eaten = True
			print(f'餌を食べました。HP:{self.health_point}')

	# 敵の探索ルール
	def search_enemy(self, enemy_list):
		# 探索範囲
		radius = self.enemy_param
		# 自分の位置
		x = self.position[0]
		y = self.position[1]

		# 鳥の近くにある敵を取得する。
		near_enemy = [enemy for enemy in enemy_list
			if np.linalg.norm(np.array([enemy.x, enemy.y]) - np.array([x, y])) < radius
		]

		# 鳥と敵の相対位置を計算する。
		relative_enemy_positions = []
		if len(near_enemy) > 0 :
			for enemy in near_enemy:
				enemy_position = np.array([enemy.x, enemy.y]) - np.array([x, y])

				# 極座標変換
				r = np.linalg.norm(enemy_position)
				theta = np.degrees(np.arctan2(enemy_position[1], enemy_position[0]))

				relative_enemy_positions.append({
						"angle" : theta,
						"distance" : r
				})
		self.enemy_positions = relative_enemy_positions
	
	# 敵に衝突する。
	def clash_enemy(self, enemy_list):
		x = self.position[0]
		y = self.position[1]

		# 鳥の近くにいる敵を取得する。
		near_enemies = [enemy for enemy in enemy_list
			if np.linalg.norm(np.array([enemy.x, enemy.y]) - np.array([x, y])) < enemy.radius
		]

		# 敵に衝突した場合、HPを下げる。
		if len(near_enemies) > 0:
			# 衝突をしたことがない敵を抽出する。
			not_clash_near_enemies = [enemy for enemy in near_enemies if not enemy.clashed]
			if len(not_clash_near_enemies) > 0:
				first_near_enemy = not_clash_near_enemies[0]
				self.health_point -= first_near_enemy.power
				first_near_enemy.clashed = True
				print(f'敵に当たりました。HP:{self.health_point}')
		else:
			for enemy in enemy_list:
				enemy.clashed = False

```

ボイドモデルには初期値として探索範囲や探索した結果を格納するリストを持たせます。
餌や敵の探索では、探索範囲を元に近くの餌や敵を探索し、探索した結果を極座標変換した後に下記のような辞書型で返すようにしています。
```python
relative_food_positions.append({
		"angle" : theta,
		"distance" : r
})
```
これは今後、この情報をローカルLLMに入力するため、このような形にしています。

## main.pyの実装
以上でボイド、餌、敵のモデルの準備ができたので、main.pyも作成していきましょう。
ついでに餌を全て食べつくしたら、クリアの文字が出るようにします。

```python:main.py
import pygame
import random
from model.bird import Bird
from model.food import Food
from model.enemy import Enemy

# 群れの総数
BIRD_NUM = 1

# 餌の総数
FOOD_NUM = 10

# 敵の総数
ENEMY_NUM = 10

# カラー定義
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)

# メイン実行
def main():
	pygame.init()
	# 画面サイズの設定
	width, height = 800, 600
	step = 0
	screen = pygame.display.set_mode((width, height))
	pygame.display.set_caption("Boid Simulation")

	# ゲームの状態
	clear_flag = False  # クリア画面を表示するフラグ

	# 鳥の総数の初期化
	bird_num = BIRD_NUM
	# 体力が尽きた鳥の総数
	health_point_over_number = 0

	# 鳥の生成
	bird_list = []
	for i in range(bird_num):
		# 初期パラメータをランダムで生成します。
		bird_list.append(Bird(
			bird_id=i,
			width=width,
			height=height,
			ai_model=ai_model
		))

	# 餌の生成
	food_list = []
	for i in range(FOOD_NUM):
		food_list.append(
			Food(
				id=i,
				x=random.uniform(0, width),
				y=random.uniform(0, height)
			)
		)

	# 敵の生成
	enemy_list = []
	for i in range(ENEMY_NUM):
		enemy_list.append(
			Enemy(
				id=i,
				x=random.uniform(0, width),
				y=random.uniform(0, height)
			)
		)

	clock = pygame.time.Clock()

	# 実行
	while True:
		# 死亡予定の鳥のリスト
		over_bird_list = []

		for event in pygame.event.get():
			if event.type == pygame.QUIT:
				pygame.quit()
				exit()

		# クリア画面
		if clear_flag:
			game_clear(
				screen=screen,
				width=width,
				height=height
			)
			continue  # シミュレーションを停止

		# それぞれの鳥の動き
		for bird in bird_list:
			# 死んだ鳥の中に、対象の鳥がいるかチェックする
			targets_in_over_bird_list = [over_bird for over_bird in over_bird_list if bird.bird_id == over_bird.bird_id]
			# 餌の探索
			bird.search_food(food_list)
			# 敵の探索
			bird.search_enemy(enemy_list)
			# 行動
			bird.move()
			# 食事
			bird.eat_food(food_list)
			# 敵との衝突
			bird.clash_enemy(enemy_list)

			# 鳥の体力がなくなると死亡する
			if bird.health_point <= 0 and len(targets_in_over_bird_list) <= 0:
				print("health point over: %s" % bird.bird_id)
				over_bird_list.append(bird)
				health_point_over_number += 1

		screen.fill((0, 0, 0))

		# 死んだ鳥を削除する
		for over_bird in over_bird_list:
			bird_list = [bird for bird in bird_list if not bird.bird_id == over_bird.bird_id]

		# 食べられた餌の数
		eaten_food_num = 0
		# 食べられた餌を削除する
		for food in food_list:
			if food.eaten:
				food_list.remove(food)
				eaten_food_num += 1
		
		if len(food_list) == 0:
			print("クリア！　餌を全て食べることができました！")
			clear_flag = True
			# pygame.quit()
			# break

		# ランダムで餌を生む
		if len(bird_list) == 0:
			print("鳥が絶滅しましたので、プログラムを終了します。")
			pygame.quit()
			break

		# 鳥を描画する
		for bird in bird_list:
			bird.display(screen)
		
		# 餌を描画する
		for food in food_list:
			food.display(screen)

		for enemy in enemy_list:
			enemy.display(screen)

		# 画面に設定を表示
		display_rendered_text(
			screen=screen,
			bird_list=bird_list,
			food_list=food_list,
			enemy_list=enemy_list,
			health_point_over_number=health_point_over_number)

		pygame.display.flip()
		clock.tick(30)
		step +=1

# 画面に設定を表示する
def display_rendered_text(
		screen, 
		bird_list, 
		food_list, 
		enemy_list,
		health_point_over_number
	):
	font = pygame.font.Font(None, 15)
	text_lines = [
		"bird number: %s" % len(bird_list),
		"food number: %s" % len(food_list),
		"enemy number: %s" % len(enemy_list),
		"health point over: %s" % health_point_over_number,
	]
	rendered_lines = [font.render(line, True, (255, 255, 255)) for line in text_lines]
	text_position = (10, 10)
	for rendered_line in rendered_lines:
		screen.blit(rendered_line, text_position)
		text_position =(text_position[0], text_position[1] + rendered_line.get_height())

def game_clear(
		screen,
		width,
		height
	):
	font = pygame.font.Font(None, 74)
	# screen.fill(BLACK)
	text = font.render("GAME CLEAR", True, RED)
	screen.blit(text, (width // 2 - 200, height // 2))
	pygame.display.flip()


if __name__ == '__main__':
	main()
```

実行した結果が以下となります。
![](https://i.gyazo.com/5f5cff1914c81f8468823c339509677f.png)
ボイドがピンクの三角、餌が青丸、敵が赤四角です。
ボイドや餌や敵の位置はランダムで表示するようにしました。
また初期の総数を指定することで、ボイドなどを増やすことができます。
```python:main.py
# 群れの総数
BIRD_NUM = 1

# 餌の総数
FOOD_NUM = 10

# 敵の総数
ENEMY_NUM = 10
```
ただし今の状態では、ボイドモデルの初期速度が0なので動くことはありません。
ただ餌や敵の位置を探索しただけで、何もできません。
探索した結果をローカルLLMに入力し、動きの指示をしてもらう必要があります。

## ローカルLLM付きボイドモデルの実装
ということでシミュレーションするための準備ができましたので、ここからローカルLLMを上記のシミュレーションに実装していきましょう。
先ほども議論したように、餌や敵の位置情報は知っているので、その情報からローカルLLMに動きを指示してもらうようにモデルを実装します。

```python:ai_agent.py
from llama_cpp import Llama
import json
import time

Gemma2 = {
	"model_path" : "./ai_model/mmnga/gemma-2-2b-it-gguf/gemma-2-2b-it-Q4_K_M.gguf",
	"chat_format" : "gemma"
}

Llama3 = {
	"model_path" : "./ai_model/bartowski/Llama-3.2-1B-Instruct-GGUF/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
	"chat_format" : "llama-3"
}

# 使用するAIモデル
# use_model = Gemma2
use_model = Llama3

prompts = [
	# 中身は後程議論します。
]


class AiAgent:
	def __init__(self):
		start_time_1 = time.time()

		llm = Llama(
			model_path=use_model["model_path"],
			chat_format=use_model["chat_format"],
			n_gpu_layers=-1, 
			# n_ctx=512
			n_ctx=2048
		)
		end_time_1 = time.time()
		print("------------------------------")
		print("モデルロード時間　", end_time_1 - start_time_1)
		print("------------------------------")

		self.model = llm
		self.prompts = prompts
	
	# 生成
	def generate(self, prompt, is_add_prompts):
		start_time_2 = time.time()
		print("------------------------------")
		print("プロンプト: ", prompt)
		print("------------------------------")

		if is_add_prompts:
			messages = list(self.prompts)
		else:
			messages = []

		messages.append(prompt)
		outputs = self.model.create_chat_completion(
			messages=messages,
			max_tokens=100, 
			temperature=0.7
		)

		output = outputs["choices"][0]["message"]["content"]
		end_time_2 = time.time()
		print("------------------------------")
		print("回答時間　", end_time_2 - start_time_2)
		print(output)
		print("------------------------------")

		return output
```

モデルを初期化する時に指定したローカルLLMをロードするようにします。
その後、`generate()`メソッドで与えられたプロンプトから回答を返すようにしました。
ボイドモデルは以下のように修正されます。

```python:bird.py
# 鳥モデル
class Bird:
	def __init__(self,
			bird_id,
			width,
			height,
			ai_model
	):
		#
		# 省略
		#
		# 生成AIモデル
		self.ai_model = ai_model

	#
	# 省略
	#
	# 生成AIによる動作指示
	def generate_ai_operation(self):
		data = {
			"enemies": list(self.enemy_positions),
			"foods": list(self.food_positions)
		}

		prompt = {
			"role" : "user",
			"content" : f'{json.dumps(data)}'
		}

		output = self.ai_model.generate(
			prompt=prompt,
			is_add_prompts=True)
		# 行ごとに処理
		for line in output.splitlines():
			if "angle" in line:
				output = line
				break

		try:
			output_json = json.loads(output)

			angle_degrees = output_json["angle"] if "angle" in output_json else None
			self.angle = np.radians(angle_degrees) if angle_degrees is not None else self.angle
			self.velocity = output_json["velocity"] if "velocity" in output_json else self.velocity

			print(f'angle: {angle_degrees}, velocity: {self.velocity}')
		except json.JSONDecodeError as e:
			return

```

ボイドモデルの初期化時にローカルLLM（AiAgentクラス）を注入し、それを利用して動作指示を生成するメソッド`generate_ai_operation()`を作りました。
このメソッドの中で、先ほど議論した餌と敵の位置情報をJSON形式に変換して、ローカルLLMのプロンプトを作成しました。
後に議論しますが、返ってきた情報からボイドの進行方向（angle）と速さ（velocity）を抽出し、その指示によってボイドが動けるようになります。

`main.py`の修正は下記2点となります。
- ローカルLLMをロードし、ロードしたローカルLLMをボイドモデルの初期化時に注入する。
- `bird.move()`メソッドの前に`generate_ai_operation()`メソッドを実装する。

```python:main.py
# メイン実行
def main():
	#
	# 省略
	#

	# 生成AIのロード
	ai_model = AiAgent()

	# 鳥の生成
	bird_list = []
	for i in range(bird_num):
		# 初期パラメータをランダムで生成します。
		bird_list.append(Bird(
			bird_id=i,
			width=width,
			height=height,
			ai_model=ai_model
		))
	
	#
	# 省略
	#
		# それぞれの鳥の動き
		for bird in bird_list:
			# 死んだ鳥の中に、対象の鳥がいるかチェックする
			targets_in_over_bird_list = [over_bird for over_bird in over_bird_list if bird.bird_id == over_bird.bird_id]
			# 餌の探索
			bird.search_food(food_list)
			# 敵の探索
			bird.search_enemy(enemy_list)
			# AIによる動作指示
			if step % 100 == 0:
				bird.generate_ai_operation()
			# 行動
			bird.move()
			# 食事
			bird.eat_food(food_list)
			# 敵との衝突
			bird.clash_enemy(enemy_list)

			# 鳥の体力がなくなると死亡する
			if bird.health_point <= 0 and len(targets_in_over_bird_list) <= 0:
				print("health point over: %s" % bird.bird_id)
				over_bird_list.append(bird)
				health_point_over_number += 1

		screen.fill((0, 0, 0))
```
ただし、ローカルLLMの生成には時間が掛かり毎回生成していては動きがフリーズしてしまうので、100ループに1回のペースで動作指示するようにしました。

## 動きを生成するためのプロンプト
ここまでで大体の実装は完了しました。
あとは入力した情報に対して動きを指示してもらえればいいのですが、これは言い換えると「動きを指示してもらうプロンプトはどのようなものがいいか？」という議論に帰着します。
ここで重要なのは「どのような指示があればボイドモデルを動かせるか」です。
今回の実装では、進行方向（angle）と速さ（velocity）があればボイドの運動は決まります。
つまりローカルLLMに出力してほしい情報というのは、上記ふたつさえあればいいということです。
餌や敵の位置情報に対して、このふたつを抽出するには下記のようなJSON形式で出力してくれるのが理想です。
```python
{'angle': 45, 'velocity': 4.5}
```
逆に言えば、入力した位置情報に対してこういう出力をするようにプロンプトで指示すればいいということです。
```python
prompts = [
		{
			"role": "user",
			"content":
				"I want to determine the angle and velocity of an agent on a 2D plane based on the following rules:\n" + 
				"・The agent moves away from enemies based on their relative distances.\n" + 
				"・The agent moves toward foods based on their relative distances.\n" + 
				"・The agent prioritizes the closest food. However, if a food is close to an enemy, the agent avoids that food and moves to another.\n" + 
				"・Based on these conditions, calculate the angle and velocity.\n" + 
				"・The distances and angles of enemies and foods will be provided in JSON format.\n" + 
				"・The agent's angle and velocity should also be returned in JSON format.\n" + 
				"・Do not include any extra text or explanations.\n" +
				"Input example:{ 'enemies': [{'angle': 0, 'distance': 2}, {'angle': 10, 'distance': 10}], 'foods': [{'angle': 45, 'distance': 400}, {'angle': 5, 'distance': 500}] }\n"
				"Output example:{'angle': 45, 'velocity': 4.5}\n" +
				"------------------------------------------\n" +
				'{ "enemies": [], "foods": [] }'
		},
		{
			"role": "assistant",
			"content": '{"angle": 10, "velocity": 2.5}'
		},
		{
			"role": "user", 
			"content" : '{ "enemies": [{"angle": 45, "distance": 800}], "foods": [{"angle": -45, "distance": 210.5}] }'
		},
		{
			"role": "assistant",
			"content": '{"angle": -45, "velocity": 3.01}'
		},
		{
			"role": "user",
			"content": '{ "enemies": [{"angle": 0, "distance": 2}, {"angle": 10, "distance": 10}], "foods": [{"angle": 10, "distance": 40},{"angle": 5, "distance": 5}] }'
		},
		{
			"role" : "assistant",
			"content" : '{"angle": 5, "velocity": 1.5}'
		},
	]
```
ということで上記のように初期プロンプトを作成しました。
まず初めにどういうルールの元ボイドモデルが動くべきか、をローカルLLMに教えました。
この時、使用しているモデルが英語に特化したモデルなので、より精度を高くするため英語で記載しました。
日本語訳をすると、以下のような感じです。
```
以下のルールに従って2次元平面上のAgentのangleとvelocityを求めたい。
・Agentとenemiesのそれぞれの相対距離（distance)から判断して、enemyから逃げる。
・Agentとfoodsのそれぞれの相対距離（distance)から判断して、foodに向かう。
・Agentは最も近いfoodに向かいます。ただしfoodとenemyが近い場合、enemyを避けて別のfoodに向かいます。
・上記の条件からangleとvelocityを求める。
・enemyとfoodのdistanceとangleはJSON形式で渡します。
・AgentのangleとvelocityもJSON形式で渡します。
・余計なテキストや説明を一切含めないでください。
入力例:{ 'enemies': [{'angle': 0, 'distance': 2}, {'angle': 10, 'distance': 10}], 'foods': [{'angle': 45, 'distance': 400}, {'angle': 5, 'distance': 500}] }
出力例:{'angle': 45, 'velocity': 4.5}
```
もっと抽象的にしてもよいのですが、とりあえずボイドモデルが動くようになってほしいので具体的にルールを記載しました。
餌と敵の位置情報についても、ボイドモデルに対する角度と相対距離をJSON形式で入力するつもりだ、と具体例を示して教えました。
その後具体的なやり取りの例を示して、理想的な出力結果を返すようにプロンプトを作成しました。

実際にこの初期プロンプトを使ってJSON形式の出力がでるか、テストをしてみましょう。
テスト用のソースコードは下記です。
```python:test_ai_agent.py
from model.ai_agent import AiAgent

# AIモデルのテスト
def main():
	# 生成AIのロード
	ai_model = AiAgent()

	prompt = {
			"role" : "user",
			"content" : "{ 'enemies': [{'angle': 0, 'distance': 2}, {'angle': 10, 'distance': 10}], 'foods': [{'angle': 45, 'distance': 400}, {'angle': 5, 'distance': 500}] }"
	}

	# 生成AIでの生成
	ai_model.generate(prompt=prompt, is_add_prompts=True)


if __name__ == '__main__':
	main()
```

実行した結果が以下となります。
```log:プロンプトを調整した実行結果
～～～略～～～
------------------------------
モデルロード時間　 0.845811128616333
------------------------------
------------------------------
プロンプト:  {'role': 'user', 'content': "{ 'enemies': [{'angle': 0, 'distance': 2}, {'angle': 10, 'distance': 10}], 'foods': [{'angle': 45, 'distance': 400}, {'angle': 5, 'distance': 500}] }"}
------------------------------
llama_perf_context_print:        load time =    3083.65 ms
llama_perf_context_print: prompt eval time =       0.00 ms /   448 tokens (    0.00 ms per token,      inf tokens per second)
llama_perf_context_print:        eval time =       0.00 ms /    14 runs   (    0.00 ms per token,      inf tokens per second)
llama_perf_context_print:       total time =    3419.58 ms /   462 tokens
------------------------------
回答時間　 3.4229013919830322
{"angle": 45, "velocity": 2.2}
------------------------------
```
期待通り、JSON形式で進行方向と速さを出力してくれました。
また出力の進行方向（angle）を見ると、プロンプトで示したfoodsのうち近い方に向かおうとしているのがわかります。
というわけでプロンプトも大丈夫そうです。

## 実行結果
それでは、`main.py`を実行してみましょう。
今回は簡単のため、ボイドモデルを1体、餌を10個、敵を5体としてシミュレーションしてみました。
![](https://i.gyazo.com/e544ecfe2e42c323f5935b09c5881229.gif)
少しわかりづらいかもしれませんが、ローカルLLMで生成された指示に従って動くようになりました。
ちゃんと餌に向かうように動いてくれますが、たまに敵に向かってしまい自滅してしまうこともあり、大変興味深い動きをしてくれます。
ただ餌や敵が周囲にいない時、止まってしまうので、そこら辺のルールも追加しないといけなさそうです。

# まとめ
今回はローカルLLMを利用してボイドモデルのシミュレーションに挑戦してみました。
簡易的な実装とはいえローカルPCでここまで精度高くLLMを動かせるのは、かなり面白いです。
今後は更に軽量なモデルにしてみたり、負荷が軽いライブラリなどで試してみたりするのが良さそうです。
やはり生成に時間が掛かってしまうので、ゲームやシミュレーションに使うとどうしても動きが鈍くなってしまいます。
例えば大量のボイドを生成して一気に動かすといったシミュレーションをするならば、それなりに負荷がかかってしまいそうです。
ここら辺の課題を改善できれば、かなり面白いシミュレーションもできそうな気がします。

また今回のシミュレーションに、[前回](/blogs/2024/08/21/boid_life_simulation/)みたいに進化的プログラミングを導入するのも大変興味深いです。
個々のモデルをシミュレーション中にどのように学習させシミュレーションすべきか、今後の課題になってきそうです。


# 参考文献
- [Googleの最新LLM「Gemma2」の使い方・性能・商用利用について解説！](https://highreso.jp/edgehub/machinelearning/gemma2.html)
- [Metaが最新版LLM「Llama3.2」を発表！注目のオープンソースLLMは何が変わった？](https://rozetta-square.jp/knowledge/8944/)
- [ローカルPCでLLMを動かす（llama-cpp-python）](https://www.insurtechlab.net/run_llm_on_localmachine_using_lama_cpp_python/)