---
title: Boid Simulation Using Local LLMs (llama.cpp, llama-cpp-python)
author: takafumi-okubo
date: 2024-12-19T00:00:00.000Z
summerRelayUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
tags:
  - ボイド
  - LLM
  - 生成AI
  - AI
  - Python
  - PyGame
  - シミュレーション
  - advent2024
image: true
translate: true

---

This is the article for Day 19 of the [Mamezou Developer Site Advent Calendar 2024](/events/advent-calendar/2024/).

# Introduction
Hello. I am Okubo, who has been playing... I mean, simulating with PyGame following my [previous](/blogs/2024/08/21/boid_life_simulation/) and [prior](/blogs/2024/03/15/pygame_boid/) articles.
This time, I combined the rapidly developing field of generative AI to simulate the boid model.

"You mean using generative AI requires buying expensive GPUs or paying somewhere to use APIs, right?"
You might think that, but actually, you can do it even on a local PC (CPU).
So this time, I'd like to introduce a simulation on my local laptop (Windows11) using open-source LLMs.

Specifically, I used a quantized LLM with the library `llama-cpp-python` to run the boid model.
![](https://i.gyazo.com/e544ecfe2e42c323f5935b09c5881229.gif)

There is some freezing during the output by the local LLM, but it moves according to the generated instructions.
I arrived at this method after trial and error, so some parts may be rough, but if you're interested, I'd be happy if you read to the end.

In this article, I will first select a local LLM. I looked for a model that is as lightweight as possible and can run smoothly on a CPU.
At that time, I used the `llama-cpp-python` library, so I will briefly introduce it.
Next, I will discuss how to implement the boid model used in this simulation, and finally, I will summarize the results.

The source code is also available on [GitHub](https://github.com/TakOkubo/ai_boid_simulation), so please take a look there as well.

# Selecting a Local LLM
## Model Candidates
Let's get started with selecting a local LLM to use in the simulation.
Since we are considering a simulation on a laptop, we will look for a model that is lightweight and can run on a CPU.
As long as it can give movement instructions in response to input, the accuracy can be moderate.

Among them, I selected the following models as candidates.
- [Gemma-2-2b-it](https://huggingface.co/google/gemma-2-2b-it)
- [Llama-3.2-1B-Instruct](https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct)

Gemma2 is an open-source LLM developed by Google that is lightweight and highly performant.
The "2b" indicates that the parameter size is 2 billion, making it the lightest among Gemma2 models. "it" indicates that it is an instruction-tuned model. An instruction-tuned model is one that can respond to human instructions, like ChatGPT.

On the other hand, LLaMA3 is an open-source LLM developed by Meta.
Because it is also recent, it is a highly performant model. LLaMA3 aims to be used on smartphones and has lightweight models with reduced parameters, such as 1B and 3B. This time, we will use the lightest 1B among them. Like with Gemma2, "Instruct" indicates that it is an instruction-tuned model.

Let's actually try using these models. Since we are assuming CPU usage, we downloaded the target models from Hugging Face and tried using them.

We put the downloaded models in a directory called `model` and executed the following source code.
``` python
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import time

model_id = "model/google/gemma-2-2b-it"
# model_id = "model/meta-llama/Llama-3.2-1B-Instruct"

def main():
	start_time_1 = time.time()

	# Load the model and tokenizer
	tokenizer = AutoTokenizer.from_pretrained(model_id)
	model = AutoModelForCausalLM.from_pretrained(
		model_id,
		device_map = "cpu",
	)

	end_time_1 = time.time()
	print("------------------------------")
	print("Model load time: ", end_time_1 - start_time_1)
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
	print("Response time: ", end_time_2 - start_time_2)
	print("------------------------------")

if __name__ == '__main__':
	main()
```

### Execution Results
```log:Results of executing Gemma2
------------------------------
Model load time:  25.756981372833252
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
Response time:  197.1345989704132
------------------------------
```

```log:Results of executing LLaMA3
------------------------------
Model load time:  5.21970796585083
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
Response time:  38.5177276134491
------------------------------
```

Since the output token count is `max_new_tokens=256` the answers are cut off midway, but the accuracy of both is acceptable.
Gemma is somewhat more humorous and interesting.

However, when we summarize the model load time and response time, we get the following:

<style>
.model_table table {
    width: 80%;
    margin:  auto; 
}
</style>

<div class="model_table">

| Model | Load Time | Response Time |
| --- | --- | --- | 
| Gemma-2-2b-it | About 25.8 seconds | About 197 seconds |
| Llama-3.2-1B-Instruct | About 5.21 seconds | About 38.5 seconds |

</div>

Hmm... It's slower than expected...
Even with LLaMA-3.2-1B, it takes 38.5 seconds for the response, so using this for a simulation seems quite impractical.
The CPU also, especially with Gemma2, became quite overloaded.
![](https://i.gyazo.com/e052711a3d4a85a05853992e81263814.jpg)

If the response time could be a bit faster and the load could be reduced, we might be able to run the simulation smoothly.

## Using llama.cpp
So, as I was looking for an even lighter model, I discovered a library that allows you to run LLMs locally.
It's called "llama.cpp".
This library allows you to run models quantized to 2–8 bit integers on CPUs.
As the name "llama" suggests, you can use LLaMA models, and as long as it's in GGUF format, you can also use other LLMs besides LLaMA.

There is also a Python library called `llama-cpp-python`, so let's install it and try using it.
```
pip install llama-cpp-python
```
Quantized models of LLMs like Gemma and LLaMA converted to GGUF format are also available on Hugging Face and can be downloaded from the following links.

- Gemma2
	- [https://huggingface.co/mmnga/gemma-2b-it-gguf](https://huggingface.co/mmnga/gemma-2b-it-gguf)
	- Model used: gemma-2-2b-it-Q4_K_M.gguf
- LLaMA3
	- [https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF](https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF)
	- Model used: Llama-3.2-1B-Instruct-Q4_K_M.gguf

Similar to before, we put the downloaded models in a directory called `model` and executed the following source code.
```python
from llama_cpp import Llama
import time

model_path = "./model/mmnga/gemma-2-2b-it-gguf/gemma-2-2b-it-Q4_K_M.gguf"
chat_format = "gemma"

# model_path = "./model/bartowski/Llama-3.2-1B-Instruct-GGUF/Llama-3.2-1B-Instruct-Q4_K_M.gguf"
# chat_format = "llama-3"
def main():
	start_time_1 = time.time()

	# Load the model and tokenizer
	llm = Llama(
		model_path=model_path, 
		chat_format=chat_format,
		n_gpu_layers=-1, 
		n_ctx=512
	)

	end_time_1 = time.time()
	print("------------------------------")
	print("Model load time: ", end_time_1 - start_time_1)
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
	print("Response time: ", end_time_2 - start_time_2)
	print("------------------------------")

if __name__ == '__main__':
	main()
```


### Execution Results
```log:Results of the quantized version of Gemma2
～～～Omitted～～～
------------------------------
Model load time: 0.5315546989440918
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
* **Humans provide labeled data:** Think of it like teaching the dog with pictures labeled "good dog" or "bad dog."
* **Algorithms learn the relationship:** The algorithm learns the relationship between input features (like the dog's posture) and the corresponding output (is it a good or bad dog).
* **Examples:** Predicting house
------------------------------
------------------------------
Response time: 13.719425916671753
------------------------------
```

```log:Results of the quantized version of LLaMA3
～～～Omitted～～～
------------------------------
Model load time: 0.8961973190307617
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
Response time: 6.306737899780273
------------------------------
```

Again, since the output token count is `max_tokens=256` the answers are cut off midway, but the accuracy is acceptable for both.
In fact, they don't seem very different!

Also, when we summarize the model load time and response time, we get the following:
<div class="model_table">

| Model | Load Time | Response Time |
| --- | --- | --- | 
| Gemma-2-2b-it | About 0.531 seconds | About 13.7 seconds |
| Llama-3.2-1B-Instruct | About 0.896 seconds | About 6.30 seconds |

</div>

Overwhelming speed!
Ideally, it would have been around a fraction of a second, but with this speed where the load is light and accuracy is reasonable, it seems usable for the simulation.
Therefore, this time, I will try simulating with the fastest "Llama-3.2-1B-Instruct".

# Simulation
## Preparations (Creating the Boid, Food, and Enemy Models)
Let's start creating the simulation using PyGame.
The goal this time is to create a boid model that moves according to instructions generated by a local LLM.
The flow of the simulation is as follows:

1. At the start of the simulation, food, enemies, and boids are placed.
2. The boids obtain the position information of the food and enemies.
3. The position information of the food and enemies is input into the local LLM.
4. The local LLM generates the boids' movements based on that information.
5. The boids move according to the generated instructions.
6. Clear condition: Eat all the placed food. Game over condition: The boids' HP reaches zero.

To realize the above flow, we will prepare the boid model (`bird.py`) and `main.py`.

### Creating the Boid Model
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

# Bird model
class Bird:
	def __init__(self,
			bird_id,
			width,
			height
	):
		self.bird_id = bird_id
		self.width = width
		self.height = height
		# Position
		self.position = np.array([random.uniform(0, width), random.uniform(0, height)])
		# Velocity and angle
		self.velocity = 0.0
		self.angle = np.radians(0)
		self.direction = np.array([np.cos(self.angle), np.sin(self.angle)])
		# Bird's HP
		self.health_point = HEALTH_POINT
		# Bird's shape
		self.polygon = np.array([(20, 0), (0, 5), (0, -5)])
		self.type_id = self.bird_id % 3
		self.color = BIRD_COLORS[self.type_id]

	# Actions
	def move(self):
		self.direction = np.array([np.cos(self.angle), np.sin(self.angle)])
		# Calculate the direction vector from the velocity.
		vector = self.velocity * (self.direction)
		if np.linalg.norm(vector) != 0:
			self.position += vector

		# When the bird hits the wall, it passes through to the opposite side.
		if self.position[0] > self.width or self.position[0] < 0:
			self.position[0] = np.abs(self.position[0] - self.width)
		if self.position[1] > self.height or self.position[1] < 0:
			self.position[1] = np.abs(self.position[1] - self.height)

	def display(self, screen):
		# Create a rotation matrix
		rotation_matrix = np.array([[np.cos(self.angle), -np.sin(self.angle)],
									[np.sin(self.angle), np.cos(self.angle)]])
		# Rotate so that the head faces the direction of movement.
		rotated_polygon = np.dot(self.polygon, rotation_matrix.T) + self.position
		pygame.draw.polygon(screen, self.color, rotated_polygon, 0)

```

In the boid model's initial values, we define HP, initial position, initial velocity, and angle.
Then, in the `move()` method, the boid moves according to the velocity and angle.

### Creating the Food and Enemy Models
Next, we create the food and enemy models.
- Food (`food.py`): An object that increases the boid's HP when eaten (does not move)
- Enemy (`enemy.py`): An object that decreases the boid's HP when collided with (does not move)

This time, for simplicity, we will create a simple simulation where food and enemies do not move.

```python:food.py
import pygame

FOOD_POWER = 150
RADIUS_OF_FOOD = 10

# Food
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

# Enemy
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

The POWER in food and enemy represents the power they have.
In the case of food, when the boid hits the food, its HP increases by the POWER amount.
In the case of enemies, when the boid hits an enemy, its HP decreases by the POWER amount.
RADIUS refers to the size of the food or enemy, i.e., the radius for collision detection.

Based on the above, we add rules for searching and eating food and enemies to the boid model.
```python:bird.py
# Bird model
class Bird:
	def __init__(self,
			bird_id,
			width,
			height,
			ai_model
	):
		#
		# Omitted
		#
		# Initial values
		self.food_param = RADIUS_OF_FOOD
		self.food_positions = []
		self.enemy_param = RADIUS_OF_ENEMY
		self.enemy_positions = []
	#
	# Omitted
	#
	# Food search rule
	def search_food(self, food_list):
		# Search range
		radius = self.food_param
		# Own position
		x = self.position[0]
		y = self.position[1]

		# Get foods near the bird.
		near_food = [food for food in food_list
			if np.linalg.norm(np.array([food.x, food.y]) - np.array([x, y])) < radius
				and not food.eaten
		]

		# Calculate the relative positions of the bird and the food.
		relative_food_positions = []
		if len(near_food) > 0 :
			for food in near_food:
				food_position = np.array([food.x, food.y]) - np.array([x, y])

				# Convert to polar coordinates
				r = np.linalg.norm(food_position)
				theta = np.degrees(np.arctan2(food_position[1], food_position[0]))

				relative_food_positions.append({
						"angle" : theta,
						"distance" : r
				})
		self.food_positions = relative_food_positions
	
	# Eating rule
	def eat_food(self, food_list):
		# Eat food
		x = self.position[0]
		y = self.position[1]

		# Get foods near the bird.
		near_foods = [food for food in food_list
			if np.linalg.norm(np.array([food.x, food.y]) - np.array([x, y])) < food.radius
				and not food.eaten
		]

		# If there is food, eat it.
		if len(near_foods) > 0:
			first_near_food = near_foods[0]
			self.health_point += first_near_food.power
			first_near_food.eaten = True
			print(f'Ate food. HP: {self.health_point}')

	# Enemy search rule
	def search_enemy(self, enemy_list):
		# Search range
		radius = self.enemy_param
		# Own position
		x = self.position[0]
		y = self.position[1]

		# Get enemies near the bird.
		near_enemy = [enemy for enemy in enemy_list
			if np.linalg.norm(np.array([enemy.x, enemy.y]) - np.array([x, y])) < radius
		]

		# Calculate the relative positions of the bird and the enemies.
		relative_enemy_positions = []
		if len(near_enemy) > 0 :
			for enemy in near_enemy:
				enemy_position = np.array([enemy.x, enemy.y]) - np.array([x, y])

				# Convert to polar coordinates
				r = np.linalg.norm(enemy_position)
				theta = np.degrees(np.arctan2(enemy_position[1], enemy_position[0]))

				relative_enemy_positions.append({
						"angle" : theta,
						"distance" : r
				})
		self.enemy_positions = relative_enemy_positions
	
	# Collide with enemy.
	def clash_enemy(self, enemy_list):
		x = self.position[0]
		y = self.position[1]

		# Get enemies near the bird.
		near_enemies = [enemy for enemy in enemy_list
			if np.linalg.norm(np.array([enemy.x, enemy.y]) - np.array([x, y])) < enemy.radius
		]

		# If collided with an enemy, reduce HP.
		if len(near_enemies) > 0:
			# Extract enemies that have not clashed yet.
			not_clash_near_enemies = [enemy for enemy in near_enemies if not enemy.clashed]
			if len(not_clash_near_enemies) > 0:
				first_near_enemy = not_clash_near_enemies[0]
				self.health_point -= first_near_enemy.power
				first_near_enemy.clashed = True
				print(f'Hit enemy. HP: {self.health_point}')
		else:
			for enemy in enemy_list:
				enemy.clashed = False

```

The boid model has initial values such as search range and lists to store the search results.
In the food and enemy searches, we search for nearby food and enemies based on the search range, and return the search results in a dictionary like the following after converting to polar coordinates.
```python
relative_food_positions.append({
		"angle" : theta,
		"distance" : r
})
```
This is because we will input this information into the local LLM later.

## Implementing `main.py`
Now that we have prepared the boid, food, and enemy models, let's also create `main.py`.
Additionally, we will make it so that when all the food is eaten, a clear message is displayed.

```python:main.py
import pygame
import random
from model.bird import Bird
from model.food import Food
from model.enemy import Enemy

# Number of flock
BIRD_NUM = 1

# Number of food
FOOD_NUM = 10

# Number of enemies
ENEMY_NUM = 10

# Color definitions
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)

# Main execution
def main():
	pygame.init()
	# Set screen size
	width, height = 800, 600
	step = 0
	screen = pygame.display.set_mode((width, height))
	pygame.display.set_caption("Boid Simulation")

	# Game state
	clear_flag = False  # Flag to display clear screen

	# Initialize total number of birds
	bird_num = BIRD_NUM
	# Number of birds that have run out of HP
	health_point_over_number = 0

	# Generate birds
	bird_list = []
	for i in range(bird_num):
		# Randomly generate initial parameters.
		bird_list.append(Bird(
			bird_id=i,
			width=width,
			height=height,
			ai_model=ai_model
		))

	# Generate food
	food_list = []
	for i in range(FOOD_NUM):
		food_list.append(
			Food(
				id=i,
				x=random.uniform(0, width),
				y=random.uniform(0, height)
			)
		)

	# Generate enemies
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

	# Execution
	while True:
		# List of birds scheduled to die
		over_bird_list = []

		for event in pygame.event.get():
			if event.type == pygame.QUIT:
				pygame.quit()
				exit()

		# Clear screen
		if clear_flag:
			game_clear(
				screen=screen,
				width=width,
				height=height
			)
			continue  # Stop simulation

		# Movements of each bird
		for bird in bird_list:
			# Check if the target bird is among the dead birds
			targets_in_over_bird_list = [over_bird for over_bird in over_bird_list if bird.bird_id == over_bird.bird_id]
			# Search for food
			bird.search_food(food_list)
			# Search for enemies
			bird.search_enemy(enemy_list)
			# Action
			bird.move()
			# Eating
			bird.eat_food(food_list)
			# Collision with enemies
			bird.clash_enemy(enemy_list)

			# If bird runs out of HP, it dies
			if bird.health_point <= 0 and len(targets_in_over_bird_list) <= 0:
				print("health point over: %s" % bird.bird_id)
				over_bird_list.append(bird)
				health_point_over_number += 1

		screen.fill((0, 0, 0))

		# Remove dead birds
		for over_bird in over_bird_list:
			bird_list = [bird for bird in bird_list if not bird.bird_id == over_bird.bird_id]

		# Number of food eaten
		eaten_food_num = 0
		# Remove eaten food
		for food in food_list:
			if food.eaten:
				food_list.remove(food)
				eaten_food_num += 1
		
		if len(food_list) == 0:
			print("Clear! All food has been eaten!")
			clear_flag = True
			# pygame.quit()
			# break

		# Randomly generate food
		if len(bird_list) == 0:
			print("All birds are extinct, terminating program.")
			pygame.quit()
			break

		# Draw birds
		for bird in bird_list:
			bird.display(screen)
		
		# Draw food
		for food in food_list:
			food.display(screen)

		for enemy in enemy_list:
			enemy.display(screen)

		# Display settings on screen
		display_rendered_text(
			screen=screen,
			bird_list=bird_list,
			food_list=food_list,
			enemy_list=enemy_list,
			health_point_over_number=health_point_over_number)

		pygame.display.flip()
		clock.tick(30)
		step +=1

# Display settings on the screen
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

When executed, the result is as follows.
![](https://i.gyazo.com/5f5cff1914c81f8468823c339509677f.png)
The boids are pink triangles, the food is blue circles, and the enemies are red squares.
The positions of the boids, food, and enemies are displayed randomly.
Also, by specifying the initial total numbers, you can increase the number of boids and so on.
```python:main.py
# Number of flock
BIRD_NUM = 1

# Number of food
FOOD_NUM = 10

# Number of enemies
ENEMY_NUM = 10
```
However, in the current state, the boid model's initial velocity is 0, so they do not move.
They just search for the positions of food and enemies but cannot do anything.
We need to input the search results into the local LLM and have it give movement instructions.

## Implementing the Boid Model with Local LLM
So now that we have prepared for simulation, let's implement the local LLM into the above simulation.
As previously discussed, since we know the positions of food and enemies, we will implement the model so that it generates movement instructions using the local LLM based on that information.

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

# Model to use
# use_model = Gemma2
use_model = Llama3

prompts = [
	# Contents will be discussed later.
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
		print("Model load time: ", end_time_1 - start_time_1)
		print("------------------------------")

		self.model = llm
		self.prompts = prompts
	
	# Generate
	def generate(self, prompt, is_add_prompts):
		start_time_2 = time.time()
		print("------------------------------")
		print("Prompt: ", prompt)
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
		print("Response time: ", end_time_2 - start_time_2)
		print(output)
		print("------------------------------")

		return output
```

When initializing the model, we make it load the specified local LLM.
After that, the `generate()` method returns the answer based on the given prompt.
The boid model is modified as follows.

```python:bird.py
# Bird model
class Bird:
	def __init__(self,
			bird_id,
			width,
			height,
			ai_model
	):
		#
		# Omitted
		#
		# Generative AI model
		self.ai_model = ai_model

	#
	# Omitted
	#
	# Generate operation instructions using generative AI
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
		# Process line by line
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

We inject the local LLM (`AiAgent` class) into the boid model during initialization, and we created a method `generate_ai_operation()` that uses it to generate movement instructions.
In this method, we converted the position information of food and enemies discussed earlier into JSON format and created prompts for the local LLM.
We will discuss later, but we extract the direction (`angle`) and speed (`velocity`) from the returned information, and the boid can move according to those instructions.

Modifications to `main.py` are the following two points.
- Load the local LLM and inject the loaded local LLM into the boid model during initialization.
- Implement the `generate_ai_operation()` method before the `bird.move()` method.

```python:main.py
# Main execution
def main():
	#
	# Omitted
	#

	# Load the generative AI
	ai_model = AiAgent()

	# Generate birds
	bird_list = []
	for i in range(bird_num):
		# Randomly generate initial parameters.
		bird_list.append(Bird(
			bird_id=i,
			width=width,
			height=height,
			ai_model=ai_model
		))
	
	#
	# Omitted
	#
		# Movements of each bird
		for bird in bird_list:
			# Check if the target bird is among the dead birds
			targets_in_over_bird_list = [over_bird for over_bird in over_bird_list if bird.bird_id == over_bird.bird_id]
			# Search for food
			bird.search_food(food_list)
			# Search for enemies
			bird.search_enemy(enemy_list)
			# Operation instructions by AI
			if step % 100 == 0:
				bird.generate_ai_operation()
			# Action
			bird.move()
			# Eating
			bird.eat_food(food_list)
			# Collision with enemies
			bird.clash_enemy(enemy_list)

			# If bird runs out of HP, it dies
			if bird.health_point <= 0 and len(targets_in_over_bird_list) <= 0:
				print("health point over: %s" % bird.bird_id)
				over_bird_list.append(bird)
				health_point_over_number += 1

		screen.fill((0, 0, 0))
```
However, generating with the local LLM takes time, and if we generate every time, the movement freezes, so we made it give movement instructions at a pace of once every 100 loops.

## Prompt for Generating Movement
With this, most of the implementation is complete.
All that's left is for us to get movement instructions in response to the inputted information, but this brings us back to the discussion of "what kind of prompt is good for getting movement instructions?"
What is important here is "what instructions are needed to move the boid model".
In this implementation, the boid's movement is determined if we have the direction (`angle`) and speed (`velocity`).
In other words, the information we want the local LLM to output is just these two.
Given the position information of food and enemies, to extract these two, it would be ideal if it outputs in JSON format like the following.
```python
{'angle': 45, 'velocity': 4.5}
```
Conversely, we need to prompt the local LLM to output like this in response to the inputted position information.
```python
prompts = [
		{
			"role": "system",
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
				"Output example:{'angle': 45, 'velocity': 4.5}"
		},
		{
			"role": "user",
			"content":'{ "enemies": [], "foods": [] }'
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
So I created the initial prompt as above.
First, I instructed the local LLM on the rules under which the boid model should move.
At this time, since the model I am using is specialized in English, I wrote it in English to improve accuracy.
In Japanese translation, it would be something like:
```
I want to determine the angle and velocity of an agent on a 2D plane based on the following rules:
・The agent moves away from enemies based on their relative distances.
・The agent moves toward foods based on their relative distances.
・The agent prioritizes the closest food. However, if a food is close to an enemy, the agent avoids that food and moves to another.
・Based on these conditions, calculate the angle and velocity.
・The distances and angles of enemies and foods will be provided in JSON format.
・The agent's angle and velocity should also be returned in JSON format.
・Do not include any extra text or explanations.
Input example:{ 'enemies': [{'angle': 0, 'distance': 2}, {'angle': 10, 'distance': 10}], 'foods': [{'angle': 45, 'distance': 400}, {'angle': 5, 'distance': 500}] }
Output example:{'angle': 45, 'velocity': 4.5}
```
It can be more abstract, but for now, I described the rules specifically so that I want the boid model to move.
I also showed that the position information of food and enemies will be input as angles and relative distances in JSON format.
Then I provided examples of specific interactions to have it return the desired output.

Let's test whether we get JSON format output using this initial prompt.
Test source code is below.
```python:test_ai_agent.py
from model.ai_agent import AiAgent

# Test AI model
def main():
	# Load the generative AI
	ai_model = AiAgent()

	prompt = {
			"role" : "user",
			"content" : "{ 'enemies': [{'angle': 0, 'distance': 2}, {'angle': 10, 'distance': 10}], 'foods': [{'angle': 45, 'distance': 400}, {'angle': 5, 'distance': 500}] }"
	}

	# Generate with the generative AI
	ai_model.generate(prompt=prompt, is_add_prompts=True)


if __name__ == '__main__':
	main()
```

The execution result is as follows.
```log:Execution result after adjusting the prompt
～～～Omitted～～～
------------------------------
Model load time: 0.845811128616333
------------------------------
------------------------------
Prompt:  {'role': 'user', 'content': "{ 'enemies': [{'angle': 0, 'distance': 2}, {'angle': 10, 'distance': 10}], 'foods': [{'angle': 45, 'distance': 400}, {'angle': 5, 'distance': 500}] }"}
------------------------------
llama_perf_context_print:        load time =    3083.65 ms
llama_perf_context_print: prompt eval time =       0.00 ms /   448 tokens (    0.00 ms per token,      inf tokens per second)
llama_perf_context_print:        eval time =       0.00 ms /    14 runs   (    0.00 ms per token,      inf tokens per second)
llama_perf_context_print:       total time =    3419.58 ms /   462 tokens
------------------------------
Response time:  3.4229013919830322
{"angle": 45, "velocity": 2.2}
------------------------------
```
As expected, it output the direction and speed in JSON format.
Also, looking at the outputted `angle`, we can see that it is trying to head towards the nearer of the `foods` we indicated in the prompt.
So the prompt seems to be okay.

## Execution Results
Let's execute `main.py`.
This time, for simplicity, I simulated with 1 boid model, 10 foods, and 5 enemies.
![](https://i.gyazo.com/e544ecfe2e42c323f5935b09c5881229.gif)
It may be a bit hard to see, but it started moving according to the instructions generated by the local LLM.
It properly moves towards the food, but sometimes heads towards the enemy and self-destructs, which is quite interesting.
However, when there are no food or enemies around, it stops, so we may need to add rules around that.

# Summary
This time, I tried simulating the boid model using a local LLM.
Even with a simple implementation, it's quite interesting that you can run an LLM with such high accuracy on a local PC.
In the future, it might be good to try with even lighter models or libraries with lighter loads.
After all, it takes time to generate, so if you use it in games or simulations, movements will inevitably become sluggish.
For example, if you simulate generating a large number of boids and moving them at once, it might impose quite a load.
If these issues can be improved, I feel that we can create quite interesting simulations.

Also, incorporating evolutionary programming like [last time](/blogs/2024/08/21/boid_life_simulation/) into this simulation is very intriguing.
How to make individual models learn and simulate during the simulation seems to be a challenge for the future.


# References
- [An explanation of Google's latest LLM "Gemma2" usage, performance, and commercial use!](https://highreso.jp/edgehub/machinelearning/gemma2.html)
- [Meta announces the latest LLM "Llama3.2"! What's changed in this notable open-source LLM?](https://rozetta-square.jp/knowledge/8944/)
- [Running LLMs on a local PC (llama-cpp-python)](https://www.insurtechlab.net/run_llm_on_localmachine_using_lama_cpp_python/)
