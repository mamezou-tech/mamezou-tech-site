---
title: Exploring Ways to Avoid Extinction of Life through Ecosystem Simulation with Artificial Life
author: takafumi-okubo
date: 2024-08-21T00:00:00.000Z
tags:
  - 夏休みの自由研究
  - 遺伝的アルゴリズム
  - Python
  - PyGame
  - ボイド
  - シミュレーション
  - AI
image: true
translate: true
---

# Introduction
It's summer vacation!!
How is everyone doing?
For students, are your homework assignments perfect?
I belong to the "leave homework until the last day of summer vacation" camp, so I have memories of repeatedly panicking at the last minute and somehow finishing overnight.
I always reflect and say never again, but as the saying goes, "Time heals all wounds." A year later, I end up doing it again... such is human nature!

That said, there are things that can't be finished overnight.
That is "Summer Vacation Independent Research"!
From choosing a theme, conducting experiments, and analysis, to compiling it into a report—it's an endless task.
It's quite a challenging assignment to complete in a single day.

To assist troubled students, I've created an ecosystem simulation using artificial life that can be done with just one computer this time.
More specifically, I developed a program that simulates bird movements called the Boid model and added new settings such as feeding, reproduction, and lifespan to conduct a simulation.
:::info
Detailed information about the basic Boid model is introduced in the link below.
"[Let's Simulate the Boid Model with PyGame](/blogs/2024/03/15/pygame_boid/)"
We recreated the movement of bird flocks in PyGame based on the three basic rules of the Boid model.
In this article, we have expanded on the content introduced in that article to conduct simulations.
:::

For reproduction, we used a method called the genetic algorithm to optimize artificial life to survive as long as possible.

First, we will briefly review the Boid model and introduce what settings were added to the Boid model and the environment in which the model operates.
After that, we will conduct a simulation that we actually applied and introduce what kind of behavior occurred and which parameters were optimized.

The source code is available on [GitHub](https://github.com/TakOkubo/boid_life_simulation), so please take a look if you're interested.

# Boid Model
The Boid model is an artificial life model devised and created by American animation programmer Craig Reynolds. The term "Boids" is a coined word meaning "bird-like things," derived from bird-old, and is an algorithm that can create flocks based on the following three simple rules.
- Cohesion: Move towards the center of the flock
- Separation: Keep distance to avoid collisions
- Alignment: Move in the same direction as nearby birds

By combining these rules, the birds on the computer exhibit surprisingly natural movements.
When you actually simulate it, you can create a simulation of artificial life that moves with cohesion, separation, and alignment as shown below.
*Images and videos can be enlarged by clicking.

![](https://gyazo.com/f590adbb642774b732946fd60d9168e6.gif)

However, there are still parts of this algorithm that can be improved.
First, these rules are merely reproducing "flock movement."
Actual birds eat, have lifespans, and reproduce.
To simulate an ecosystem closer to real birds, such rules and definitions need to be added.

Also, in this model, there are multiple parameters that need to be set arbitrarily for each rule.
For example, in the cohesion rule, the force to move towards the center of the flock (cohesion power in the diagram above) and the range within which birds gather (cohesion radius in the diagram above) are set.
The same applies to the separation and alignment rules, and the parameters to be set increase as rules are added.
These parameters need to be adjusted manually and are not naturally determined.
Personally, I feel it's a bit unnatural for humans to manually set parameters to reproduce the optimal bird movement.

# Additional Settings to the Boid Model
Therefore, to simulate something closer to actual birds, I added the following settings to the simulation this time.
- Stamina and Lifespan
- Foraging and Eating
- Reproduction

## Stamina and Lifespan
First, I set stamina and lifespan in the Boid model.
I added a speed parameter to the bird's movement, and set it so that stamina is reduced each time it moves at that speed.
If the bird moves too fast, its stamina decreases accordingly, and conversely, if it moves slowly, the stamina depletion is slower.
When stamina reaches 0, the bird dies.
For example, if the initial stamina is 500 and the bird's speed is 20, the stamina decreases by 20 each time, conserving energy but moving sluggishly.
Conversely, if the speed is 50, the bird can move faster, but its stamina decreases by 50 each time, quickly depleting and eventually leading to death.

Next is lifespan, where the bird consumes lifespan each time it goes through a cycle.
This is unrelated to speed or movement, and even if there is plenty of stamina, the bird will die when it reaches the end of its lifespan.

The simulation with stamina and lifespan settings is shown below.
<!-- Simulation with stamina and lifespan settings -->
| Speed:20 | Speed:50 |
|---|---|
|![](https://i.gyazo.com/a7aaf81f85818cbab794c35c0d3c4f37.gif)|![](https://i.gyazo.com/bca816a3726da1aab86afc5cf2249a16.gif)|

The left image is a simulation of birds moving at speed 20, and the right image is of birds moving at speed 50.
Stamina is randomly set between 500 and 1000.
You can see that the right image, where the birds move faster, leads to extinction quickly.

Watching this simulation, most birds have no means to recover and die before reaching the end of their lifespan.
Therefore, let's place food next to recover the birds' stamina and extend their survival period.

## Foraging and Eating
To allow the birds to eat, the concept of food needs to be introduced into this environment.
Therefore, I created a new food model.
```python:food.py
import pygame
import random

FOOD_POWER = 150
RADIUS_OF_FOOD = 10

# Food
class Food:
	def __init__(self, x, y, food_power=FOOD_POWER):
		self.x = x
		self.y = y
		self.food_power = food_power
		self.food_radius = RADIUS_OF_FOOD
		self.eaten = False

	def move(self):
		pass

	def display(self, screen):
		pygame.draw.circle(screen, (0, 0, 255), (int(self.x), int(self.y)), RADIUS_OF_FOOD)
```

`FOOD_POWER` is the energy the food has, and when a bird eats the food, it recovers by `FOOD_POWER`.
`RADIUS_OF_FOOD` is the size of the food.
The food model is set to be generated randomly on the screen.
Additionally, when food is eaten, it is set to grow again with a certain probability.
<!-- Addition of food model -->
![](https://i.gyazo.com/0c0d4194cb10a943cec8c3f489546809.png)

It doesn't look very appetizing, but the blue circles in the image above represent food.
Birds are set to eat food when they approach it (eating rule),
and a rule was added for birds to chase food (foraging rule) by applying the cohesion rule.

Specifically, the foraging rule is set as follows:
- Birds search for food within a certain radius centered on themselves.
- The closest food to the bird is selected.
- An acceleration vector is calculated to move towards the closest food.
- The acceleration vector calculated by the cohesion, separation, and alignment rules is combined to determine the direction of movement, allowing the birds to form flocks while chasing food.

The eating rule is simpler:
- When a bird reaches the position of the food (+ the size of the food is also considered), it eats the food.
- The eaten food is removed from the environment.
- When food is eaten, it grows with a certain probability.

The simulation with these two rules added is shown below.
<!-- Foraging and eating rules -->
![](https://i.gyazo.com/7a414f457be3b6503f27581f52beb5e4.gif)

With the addition of the foraging and eating rules, deaths due to stamina depletion have decreased, but since there is a lifespan, the number of individuals gradually decreases and eventually goes extinct.
As the final setting, let's add a reproduction rule to avoid extinction.

## Reproduction
Even with the addition of the foraging and eating rules, birds have a lifespan, so the number of individuals gradually decreases.
To prevent this, it is necessary to create new birds at a certain probability.
Actual birds reproduce by mating two birds, so I set the reproduction rule as follows:
- Birds search for flocks within a certain radius centered on themselves.
- The bird with the highest stamina, other than its parent, is selected.
- The stamina of the two birds is reduced by 200 (since mating and childbirth require stamina).
- A child is generated.

The simulation with this rule added is shown below.
<!-- Reproduction rule -->
![](https://i.gyazo.com/dadeaaa0ec68b2f8a924cfb9a0d75d86.gif)

In the short video, it might be a bit hard to see, but you can notice that the part labeled "born" in the upper left is gradually increasing.
This indicates the total number of birds born.
With the addition of the reproduction rule, death and reproduction are repeated, and by fine-tuning parameters such as the number of food items and the initial number of birds, it became possible to create a stable group.

# To Optimize Parameters
So far, we have added numerous rules, but as the number of rules increased, the number of parameters that needed to be adjusted also increased.

| Rule | Parameter | Description |
| :---: | :---: | --- |
| Cohesion | POWER_OF_COHERE | Force to move towards the center of the flock |
| | RADIUS_OF_COHERE | Range to search for flocks to apply the cohesion rule |
| Separation | POWER_OF_SEPARATE | Force to move away from the center of the flock |
| | RADIUS_OF_SEPARATE | Range to search for flocks to apply the separation rule |
| Alignment | POWER_OF_ALIGN | Force to align in the same direction as the flock's movement direction |
| | RADIUS_OF_ALIGN | Range to search for flocks to apply the alignment rule |
| Foraging | POWER_OF_FOOD | Force to move towards food |
| | RADIUS_OF_FOOD | Range to search for food |
| Reproduction | RADIUS_OF_BORN | Range to search for birds to reproduce (mating range) |
| Stamina | HEALTH_POINT | Bird's stamina |
| | BIRD_SPEED | Bird's speed. Stamina decreases each time the bird moves fast |
| Lifespan | LIFESPAN_POINT | Bird's lifespan |

Listing the rules and each parameter, we ended up defining quite a few parameters.
To avoid extinction and create a stable group, these parameters need to be manually adjusted, which feels somewhat unnatural.
Therefore, let's add an algorithm to optimize parameters naturally to the "reproduction rule."
:::alert
This is what is commonly known as a "genetic algorithm," but to do it properly requires more complex algorithms such as fitness calculations.
Therefore, please note that we are simulating with a very simplified algorithm here.
:::

By adding this optimization algorithm, we set the reproduction rule as follows:
- Birds search for flocks within a certain radius centered on themselves.
- The bird with the highest stamina, other than its parent, is selected.
- The stamina of the two birds is reduced by 200 (since mating and childbirth require stamina).
- For each parameter, the parameter of the bird with higher stamina is adopted (crossover). ← ★Added part
- The adopted parameter is returned with a certain probability of being randomized (mutation). ← ★Added part
- The returned parameter is defined as the child's parameter. ← ★Added part
- A child is generated.

Additionally, the initially generated birds are set to have random values for each parameter.
:::alert
However, stamina and lifespan are fixed.
While optimization seems to increase the probability of avoiding extinction,
the goal here is to optimize parameters related to movement, so we set it this way.
:::
```python:bird.py
import pygame
import random
import numpy as np

RANGE_OF_DIRECTIONS = [0, 360]
BIRD_COLORS = [
	'#FFA5CC',  # pink
	'#80FF25',  # green
	'#A0D4FF',  # skyblue
]

# -----------------------------------------
# Maximum/Minimum values for generating random parameters
# Used when using a genetic algorithm (IS_USE_GA = True).
# -----------------------------------------
# Speed of movement
BIRD_SPEED = 20
# Cohesion rule
POWER_OF_COHERE = 1000
RADIUS_OF_COHERE = 300
# Separation rule
POWER_OF_SEPARATE = 1000
RADIUS_OF_SEPARATE = 300
# Alignment rule
POWER_OF_ALIGN = 1000
RADIUS_OF_ALIGN = 300
# Reproduction rule
RADIUS_OF_BORN = 300
# Eating rule
POWER_OF_FOOD = 1000
RADIUS_OF_FOOD = 300
# HP
HEALTH_POINT = 500
# Maximum lifespan
LIFESPAN_POINT = 1000

# Mutation rule
MUTATION_RATE = 0.01
MUTATION_POWER_RATE = 2
MUTATION_RADIUS_RATE = 2
#
# -----------------------------------------
#

# Bird model
class Bird:
	def __init__(self,
			bird_id,
			width,
			height,
			parent_bird_ids= None,
			type_id=None,
			speed_param = None,
			cohere_param = None,
			separate_param = None,
			align_param = None,
			food_param = None,
			born_param = None,
			position = None,
			health_point = HEALTH_POINT,
			lifespan = None,
			generation_id = None
	):
		self.bird_id = bird_id
		self.width = width
		self.height = height
		self.parent_bird_ids = parent_bird_ids if parent_bird_ids is not None else []
		self.generation_id = generation_id if generation_id is not None else 1
		# Initial values
		self.speed_param = speed_param if speed_param is not None else random.randint(0, BIRD_SPEED)
		self.cohere_param = cohere_param if cohere_param is not None else (random.uniform(0, POWER_OF_COHERE), random.randint(0, RADIUS_OF_COHERE))
		self.separate_param = separate_param if separate_param is not None else (random.uniform(0, POWER_OF_SEPARATE), random.randint(0, RADIUS_OF_SEPARATE))
		self.align_param = align_param if align_param is not None else (random.uniform(0, POWER_OF_ALIGN), random.randint(0, RADIUS_OF_ALIGN))
		self.born_param = born_param if born_param is not None else (1, random.randint(0,RADIUS_OF_BORN))
		self.food_param = food_param if food_param is not None else (random.uniform(0, POWER_OF_FOOD), random.randint(0, RADIUS_OF_FOOD))
		# Random initial angle
		self.direction = random.uniform(
			np.radians(RANGE_OF_DIRECTIONS[0]),
			np.radians(RANGE_OF_DIRECTIONS[1])
		)
		# Position and velocity vector
		self.position = position if position is not None else np.array([random.uniform(0, width), random.uniform(0, height)])
		self.velocity = np.array([np.cos(self.direction), np.sin(self.direction)])
		# Acceleration vector
		self.acceleration = np.array([0, 0])
		self.acceleration_to_cohere = np.array([0, 0])
		self.acceleration_to_separate = np.array([0, 0])
		self.acceleration_to_align = np.array([0, 0])
		self.acceleration_to_food = np.array([0, 0])
		# Bird's HP
		self.health_point = health_point
		# Bird's lifespan
		self.lifespan = lifespan if lifespan is not None else random.randint(200, LIFESPAN_POINT)
		# Bird's shape
		self.polygon = np.array([(20, 0), (0, 5), (0, -5)])
		self.type_id = type_id if type_id else self.bird_id % 3
		self.color = BIRD_COLORS[self.type_id]
	
	#
	#  Omitted
	#

	# Reproduction rule
	def born(self, last_index, bird_list, distance_l, is_use_ga):
		power, radius = self.born_param

		near_birds = self.get_near_bird_list(bird_list, distance_l, radius, True)
		near_birds_without_parent = [bird for bird in near_birds if self.bird_id not in bird.parent_bird_ids]

		child_bird = None
		if self.health_point > 500 and len(near_birds_without_parent) > 0:
			# Select the bird with the highest HP
			pair_bird = max(near_birds_without_parent, key=lambda bird: bird.health_point)
			pair_bird_index = next((i for i in range(len(bird_list)) if bird_list[i].bird_id == pair_bird.bird_id), -1)

			if pair_bird.health_point < 500 or pair_bird_index == -1:
				return None
			
			# Reduce the health points of both parents
			self.health_point -= 200
			pair_bird.health_point -=200

			# Generate child parameters through crossover and mutation
			def blend_param(param1, param2):
				if is_use_ga:
					# Prioritize returning the parameter of the parent with higher health points
					if self.health_point >= pair_bird.health_point:
						return param1
					else:
						return param2
					# If taking the average of both parents, use this option.
					# return (param1[0] + param2[0]) / 2 , round((param1[1] + param2[1]) / 2) 
				else:
					# Since the genetic algorithm is not used, return its own parameter.
					return param1
			
			def mutate_param(param):
				if is_use_ga and random.uniform(0, 1) <= MUTATION_RATE:
					print("occur mutation")
					return (random.uniform(0, param[0] * MUTATION_POWER_RATE), random.randint(0, param[1] * MUTATION_RADIUS_RATE))

				return param

			child_speed_param = mutate_param(blend_param((0, self.speed_param), (0, pair_bird.speed_param)))[1]
		,```python:bird.py
			child_cohere_param = mutate_param(blend_param(self.cohere_param, pair_bird.cohere_param))
			child_separate_param = mutate_param(blend_param(self.separate_param, pair_bird.separate_param))
			child_align_param = mutate_param(blend_param(self.align_param, pair_bird.align_param))
			child_food_param = mutate_param(blend_param(self.food_param, pair_bird.food_param))
			child_born_param = mutate_param(blend_param(self.born_param, pair_bird.born_param))
			# Initial position of the child
			child_position = np.array([random.uniform(0, self.width), random.uniform(0, self.height)])
			# Generation number of the child
			child_generation_id = max(self.generation_id, pair_bird.generation_id) + 1

			# Generate the child
			child_bird = Bird(
				bird_id=last_index + 1,
				width=self.width,
				height=self.height,
				parent_bird_ids=[self.bird_id, pair_bird.bird_id],
				speed_param=child_speed_param,
				cohere_param=child_cohere_param,
				separate_param=child_separate_param,
				align_param=child_align_param,
				born_param=child_born_param,
				food_param=child_food_param,
				position=child_position,
				generation_id=child_generation_id
			)
			bird_list.append(child_bird)
			bird_list[pair_bird_index] = pair_bird
			print("child born")

		return child_bird
	
	#
	#  Omitted
	#
```

By doing this, individuals with higher stamina (i.e., less likely to die) naturally increase.
In the actual simulation, at first, there were individuals who quickly died due to lack of stamina, but gradually, you can see that the strength to chase food increases to maintain stamina.

<!-- Simulation with genetic algorithm added -->
![](https://i.gyazo.com/5ef4fbf5cde3a953012143dee38151b4.gif)

Additionally, reproduction seems to be happening frequently, so the number of individuals seems to be stable around 50.
However, the initial number of food items is set to 10, newly born food to 5, and the probability of food growing to 50%.
If you increase the initial amount of food or the amount of newly born food, the number of individuals should increase more.

For example, if the initial number of food items is set to 20, newly born food to 10, and the probability of food growing to 50%,
![](https://i.gyazo.com/c48953758f639f0aa624f9b5f26d5b4a.gif)
the group stabilized at around 100 individuals.
Occasionally, due to an increase in the number of birds, the food becomes depleted, leading to a rapid decrease to about 20 individuals, which can also be observed, but that too seems biological.

# Results of the Ecosystem Simulation
Let's take a closer look at how the parameters evolved.
Here, the initial values were set as follows:
- Initial number of birds: 100
- Initial number of food items: 10
- Newly born food: 10
- Probability of food growing: 50%

With these initial values, I simulated until about 10,000 birds were born.
![](https://i.gyazo.com/6e7db236f3faa41070dfe8094e0d158f.gif)
In this case, the group stabilized at around 50 individuals.
First, let's look at the force to move towards food and the range of food exploration.
![](https://i.gyazo.com/5edacaf147a4b8852f87d7f7c62c9b98.jpg)
![](https://i.gyazo.com/fbc26dd2fda0fcda0c34a146bfc04c95.png)
The horizontal axis represents generations. When a parent gives birth to a child, the child's generation is set to be one larger than the parent's.

Looking at this scatter plot, the force to move towards food becomes quite strong to avoid reducing stamina.
The range of food exploration seems to converge around 180, but it still appears somewhat random.
In the actual simulation, it seemed that the force to move towards food was significant.

Next, let's analyze the speed of the birds.
Initially, the speeds were slow or fast, but gradually, they settled around a value of 20.
![](https://i.gyazo.com/fa73277f3056c4a4ef94c7fd80a90d89.jpg)
Since speed is set to reduce stamina, this seems like an unexpected result.
It seems they decided that it is better to eat food faster than other birds, even if it means reducing stamina.
Indeed, considering actual animals, competition for food occurs for individual survival, so it can be considered that this simulation reproduces that.
Even though the birds themselves are only subject to rules (i.e., no brain), it is interesting that movements similar to actual animals are reproduced.

Furthermore, regarding the range for finding birds to reproduce (mating range), it was found that it gradually decreases.
![](https://i.gyazo.com/18268d0f09ec5e3f33401b4ea6dd3800.png)
Since stamina decreases with mating, this is natural.
However, this would lead to a decrease in the number of individuals.
Since I was able to simulate up to 10,000 birds, reproduction must be occurring.
Perhaps in this environment, even with a small mating range, if around 50 birds move freely, the frequency of bird collisions is high, allowing natural reproduction.

Looking at other parameters, they are as follows.
I made graphs of force and range for cohesion, separation, and alignment rules.

| | Force | Range |
|:---:|:---:|:---:|
| Cohesion | ![](https://i.gyazo.com/34297931765b78eb9d8d07fe4987486b.png) | ![](https://i.gyazo.com/c5db1e750c640e4f0d1d8c08205250b1.png) |
| Separation | ![](https://i.gyazo.com/06d03d68f60e3fdcd4e6157e6ed86a38.png) | ![](https://i.gyazo.com/60038a90d26034cc492584ffd7a3a0ec.png) |
| Alignment | ![](https://i.gyazo.com/c65b78b99e48574d1b1d08389fcd35bf.png) | ![](https://i.gyazo.com/02b02d588e50b70285aba1b27d4d2907.png) |

For cohesion and separation rules, the force tends to weaken, and the range tends to widen.
In the case of the alignment rule, the force is moderate, and the range tends to narrow.
None of the six parameters are directly related to stamina, but at least in this simulated environment, it seems that group activity is unnecessary for survival.

# Summary
This time, we expanded the Boid model and conducted a simulation by adding settings for "stamina and lifespan," "foraging and eating," and "reproduction."
When reproducing, we used a simplified genetic algorithm to optimize parameters based on stamina.
As a result of generating about 10,000 birds, it was found that in the environment tested this time, the group was optimized as individual groups prioritizing food acquisition.
This simulation was conducted with 100 initial birds, 10 initial food items, 10 newly born food items, and a 50% probability of food growing.
Adjusting the amount of food, its appearance probability, or the screen size might lead to various changes.

Additionally, in this simulation, only one child was born.
In reality, animals usually give birth to multiple offspring, so it might be interesting to increase the number of offspring while adding some rules.
Speaking of actual animals, the presence of predators is also important.
If predators are introduced and settings are made to escape from them, different movements might be observed.

Furthermore, if the settings for birds are applied to predators and food themselves to perform life activities, it might be possible to simulate the natural environment itself.
In this case, it would be fascinating to observe how birds, predators, and food interact and what kind of development can be observed.

That said, including this ecosystem simulation, the Boid model is ultimately a rule-based model.
In other words, birds without brains are just moving around according to rules.
Of course, animals have brains that think, and the rules themselves are set by humans, which feels a bit unnatural to me personally.
Of course, I believe these are optimal rules based on observations of actual animals, but the natural world exists without human intervention.
Therefore, it feels more natural to let the birds themselves think and move without rules.
For example, using the currently popular generative AI might be one approach.
When only the environment is set, how does each bird (AI) think, communicate, and move as individuals and as a group in that environment?
Just thinking about it seems like a very interesting simulation.

Since it seems like a simulation that can still be developed (played with), I plan to continue improving it little by little.

# Source Code
- It is available on [GitHub](https://github.com/TakOkubo/boid_life_simulation).

# References
- [Let's Simulate the Boid Model with PyGame](/blogs/2024/03/15/pygame_boid/)
- [Mizuki Oka, Takashi Ikegami, Dominique Chen, Ryuta Aoki, Norihiro Maruyama, "Making and Moving ALife: An Introduction to Artificial Life Model Theory through Implementation"](https://www.oreilly.co.jp/books/9784873118475/)
- [Drawing Graphs with Processing ㉑ Boid Model](https://note.com/creativival/n/n7c17d4dcdb6b)
- [Drawing Graphs with Processing ㉒ Bird and Food Simulation](https://note.com/creativival/n/nc38a6de5487e)
