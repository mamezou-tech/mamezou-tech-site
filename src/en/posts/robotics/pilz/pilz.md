---
title: 【ROS】Tried Using Pilz Industrial Motion Planner
author: takashi-hasegawa
date: 2024-06-11T00:00:00.000Z
tags:
  - ROS
  - Moveit
image: true
translate: true

---




Hello. This is Hasegawa from the Engineering Solutions Division.

In this article, I will introduce the Pilz Industrial Motion Planner, one of the motion planner libraries of MoveIt. MoveIt is a very convenient tool when performing robot manipulation using ROS. However, when using the default motion planner, there was a challenge where the operation would pause every time it reached a teaching point.
To solve this issue, I was looking for a way to move along a trajectory that smoothly connects multiple teaching points, and I came across the Pilz Industrial Motion Planner.
This time, I will introduce the features and advantages of this planner.

# Overview of Pilz Industrial Motion Planner
## Role of the Motion Planner

Pilz Industrial Motion Planner is a type of motion planner. In generating robot movements using MoveIt, the motion planner receives the target position of the end effector, calculates the angles of each joint, and generates a trajectory to reach the target position.
For the characteristics of each planner available in MoveIt, please refer to the link below.

[Planners Available in MoveIt](https://moveit.ros.org/documentation/planners/)

## Features of the Library

Pilz Industrial Motion Planner is a library initially developed as part of the ROS-Industrial project. It was developed with the concept of bringing interfaces equivalent to conventional industrial robots into the world of ROS and was incorporated into the MoveIt repository in 2020.

The feature of Pilz is that it can achieve smooth movements (sequence movements) by connecting multiple motion commands seamlessly.
It can receive multiple motion commands as a single request and generate a smooth trajectory without stopping between movements.

In other planners like OMPL, each motion command completes a request, so the robot stops moving every time it reaches the target position.

Additionally, it can smooth the trajectory between movements, and by specifying a parameter called blend radius, the degree of smoothness can be specified.
For example, in a site where takt time is considered, if you want to move the robot as quickly as possible, having such intuitive parameters makes adjustments easier.

# Available Commands

## Basic Commands
Pilz Industrial Motion Planner has three basic commands: PTP, LIN, and CIRC.
### PTP

The PTP command moves the robot so that the end effector reaches the specified coordinates. It does not specify the trajectory in 3D space.

### LIN

In the LIN command, the end effector moves along a straight line connecting the starting point to the endpoint.
If there is an unattainable posture between the starting point and the endpoint, the operation will fail.

The difference between PTP and LIN trajectories is easy to understand when viewed in a video.

<iframe width="100%" height="315" src="https://www.youtube.com/embed/WOL-jQg79Ss?si=nmRluy5_7G89ESVa" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

### CIRC

In the CIRC command, you can command movements that draw an arc.
To define an arc in 3D space, two points (the starting point and the endpoint) are not enough, so you need to specify either the center point of the arc or a third point on the arc and provide the coordinate information.
In either method, if the specified information cannot define the arc, the command will end with an error.

## Sequence Commands

In sequence commands, the above basic commands are executed consecutively.
Additionally, as shown in the figure below, a blend radius can be specified. When the end effector of the robot enters the blend radius of the teaching point, it starts moving towards the next teaching point before reaching the teaching point.

![Caption](/img/robotics/pilz/sequence.png)

Quoted from the documentation of [Pilz Industrial Motion Planner](https://moveit.github.io/moveit_tutorials/doc/pilz_industrial_motion_planner/pilz_industrial_motion_planner.html#user-interface-sequence-capability).

# How to Use

I will explain how to actually use the Pilz motion planner.

The execution environment is Ubuntu 20.04, and the distribution is ROS1 noetic.

## Preparing moveit config
Regardless of using the Pilz Industrial Motion Planner, when using MoveIt, you need to prepare a set of configuration files tailored to the robot.
For well-known robots, files named {robot name}_moveit_config are publicly available on Github, and if you can obtain the URDF file, you also have the option to use the setup assistant to generate the configuration files.

When using publicly available files, be aware that they may not include parameters for Pilz.
If "pilz_industrial_motion_planner_planning_pipeline.launch.xml" is included in the launch folder, it can be used.

This time, I will use [prbt](https://wiki.ros.org/pilz_robots).
Install the necessary packages.

```bash
sudo apt update
sudo apt install ros-noetic-pilz-robots
sudo apt install ros-noetic-pilz-industrial-motion
```

## Launch move_group Node

Launch the move_group node.
Specify pilz_industrial_motion_planner as a parameter at startup.

```bash
roslaunch prbt_moveit_config moveit_planning_execution pipeline:=pilz_industrial_motion_planner
```

In the [moveit_planning_execution.launch](https://github.com/PilzDE/pilz_robots/blob/noetic-devel/prbt_moveit_config/launch/moveit_planning_execution.launch) included in the moveit_config of prbt, the pipeline parameter can be received from the command line, but the launch file created by the setup assistant does not. You need to modify it with reference to the prbt launch file.

## Request Motion Commands

Send a request to the launched move_group node.
The type of message to send is described in the [MoveIt documentation](https://moveit.github.io/moveit_tutorials/doc/pilz_industrial_motion_planner/pilz_industrial_motion_planner.html#the-ptp-motion-command).
Of course, you can write your own publisher, but since the python interface for the Pilz motion planner, [pilz_robot_programming](https://wiki.ros.org/pilz_robot_programming), is publicly available, we will use this one this time.

Below is an example of executing a sequence command.

```python
#!/usr/bin/env python3
from geometry_msgs.msg import Pose, Point
from pilz_robot_programming import *
import math
import rospy

__REQUIRED_API_VERSION__ = "1"  # API version
__ROBOT_VELOCITY__ = 0.3      # velocity of the robot

# main program
def start_program():
    frange_front_orientation = from_euler(math.radians(90), math.radians(-90), math.radians(0))
    
    blend_sequence= Sequence()
    
    blend_sequence.append(Lin(goal=Pose(position=Point(-0.1, -0.55, 0.35),orientation=frange_front_orientation), vel_scale=__ROBOT_VELOCITY__), blend_radius=0.04)
    blend_sequence.append(Lin(goal=Pose(position=Point(0., -0.55, 0.55),orientation=frange_front_orientation), vel_scale=__ROBOT_VELOCITY__), blend_radius=0.08)
    blend_sequence.append(Lin(goal=Pose(position=Point(0.1, -0.55, 0.35),orientation=frange_front_orientation), vel_scale=__ROBOT_VELOCITY__), blend_radius=0.12)
    blend_sequence.append(Lin(goal=Pose(position=Point(0.2, -0.55, 0.55),orientation=frange_front_orientation), vel_scale=__ROBOT_VELOCITY__))
   
    r.move(blend_sequence)
    
    
if __name__ == "__main__":
    # init a rosnode
    rospy.init_node('robot_program_node')

    # initialisation
    r = Robot(__REQUIRED_API_VERSION__) 
    
    # start the main program
    start_program()
```

When executed, it operates as shown in the following video.
In this example, four LIN commands are executed together in a sequence command.
I prepared three patterns of `blend_radius` argument values: 0.04, 0.08, and 0.12, and you can see that the larger the value, the smoother the connection of the trajectory becomes.

<iframe width="100%" height="315" src="https://www.youtube.com/embed/NyyHtrfrbfQ?si=MRQjsobOin-s3r2F" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

As a side note, in this video, the 4th and 6th axes move rapidly around the 7-second mark.
This is because it passes near an unattainable posture called a singularity in LIN or CIRC movements.
In this simulation environment, it is able to move, but in the actual machine, it would be an unattainable speed, so it is necessary to avoid the singularity.
The singularity will be explained in the series article [Algorithm for Robot Manipulator Control](https://developer.mamezou-tech.com/robotics/manip-algo2/manip-algo2/#4-%E7%B5%82%E3%82%8F%E3%82%8A%E3%81%AB).

## References

[pilz_robots/Tutorials - ROS Wiki](http://wiki.ros.org/pilz_robots/Tutorials)
[pilz_robot_programming 0.5.0 documentation](https://docs.ros.org/en/noetic/api/pilz_robot_programming/html/)
