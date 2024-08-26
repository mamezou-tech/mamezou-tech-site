---
title: Algorithm 3 for Robot Manipulator Control
author: takahiro-ishii
date: 2024-08-20T00:00:00.000Z
tags:
  - ロボット
  - マニピュレータ
  - アルゴリズム
  - 軌跡生成
  - 逆運動学
  - ヤコビ行列
  - 同次行列
  - 特異点
  - 特異点回避
image: true
prevPage: ./src/posts/robotics/manip-algo2/manip-algo2.md
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/robotics/manip-algo3/manip-algo3/).
:::

<script type="text/javascript" async src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML">
</script>
<script type="text/x-mathjax-config">
 MathJax.Hub.Config({
 tex2jax: {
 inlineMath: [['$', '$'] ],
 displayMath: [ ['$$','$$'], ["\\[","\\]"] ]
 }
 });
</script>

# Algorithm 3 for Robot Manipulator Control
Takahiro Ishii, Engineering Solutions Division, Mamezou Co., Ltd.

## 1. Introduction
At Mamezou Co., Ltd., we develop various robot technologies. While we often develop applied technologies using robots from other companies to meet client demands, we also develop industrial robots with 6-axis or 7-axis arms, commonly known as robot arms or manipulators, from scratch. Through this development, we generate various applied technologies and proposals. I would like to share the insights gained here with the readers. In this explanation, I will use a 6-axis industrial vertical articulated manipulator as an example to explain the various mechanisms for controlling it.

This time, I will explain the "singularity" problem, which inevitably arises when applying the previously explained [trajectory generation processing algorithm][1] to operate a manipulator or robot arm, including the theory. I will also introduce an example of a solution, known as "singularity avoidance."

[1]:https://developer.mamezou-tech.com/robotics/manip-algo2/manip-algo2/

## 2. Singularity of Robot Arm
### What is a Singularity?
As mentioned earlier, a robot arm can assume various postures by moving its six joint axes, changing the position and orientation (direction, angle) of the tool tip (TCP=Tool Center Point). However, when approaching or moving away from a specific posture, some parts of the arm may suddenly move rapidly, placing excessive loads on the servo motors or reducers, or causing significant vibrations. This specific posture is called a "singularity" of the robot arm. For the 6-axis industrial vertical articulated manipulator discussed in this article, the following three singularities are empirically known:

1. Shoulder Singularity
2. Elbow Singularity
3. Wrist Singularity

In the manipulator geometry shown below, (※Z-axis is the rotation axis at each joint)
![](/img/robotics/manip-algo3/robo-geom.png)

These three singularities are defined as follows.

![](/img/robotics/manip-algo3/singularity.png)

When the posture approaches these singularities, the arm's movement becomes problematic. For example, when moving slowly in the Z4 axis (Bn axis) direction (from back to front in this diagram) from the "3. Wrist Singularity" posture without changing the TCP's orientation, the arm between P3 and P4 may suddenly rotate around the Z3 axis (Rt axis). This rotation angle can reach nearly 90 degrees in an instant. Since the component beyond P3 is quite heavy, a sudden load is applied to the Rt axis servo motor, sometimes causing significant vibrations.

## Mathematical Explanation of Singularity

Let's mathematically explain what these singularities are.

First, let's revisit the Jacobian matrix and its usage introduced in the description of "forward/inverse kinematics calculation of velocity" explained earlier.

* $\vec{P_t}$: TCP position
* $\vec{P_0}$: Base coordinate system origin position
* "$\times$" is the cross product
* The T in the superscript denotes matrix transposition.

$$
J=\left(
\begin{array}{ccccc}
 [\vec{Z_0} \times (\vec{P_t}-\vec{P_0})]^T & [\vec{Z_1} \times (\vec{P_t}-\vec{P_1})]^T & [\vec{Z_2} \times (\vec{P_t}-\vec{P_2})]^T & ... &[\vec{Z_5} \times (\vec{P_t}-\vec{P_5})]^T\\
 \vec{Z_0}^T  & \vec{Z_1}^T & \vec{Z_2}^T & ... & \vec{Z_5}^T\\
 \end{array}
\right)
$$

Using this Jacobian matrix, the translational and rotational velocities of the TCP can be calculated from the joint axis velocities as follows.
$$
\vec{v}=J \vec{\omega}
$$
The inverse transformation can also be performed as follows.
$$
\vec{\omega} =J^{-1} \vec{v}
$$
Here,
* $\vec{\omega}$: 6-dimensional column vector representing the angular velocity of each joint axis
* $\vec{v}$: 6-dimensional column vector representing the TCP velocity

More specifically,

* $\omega_i$: \{ ${i=1,2,\cdots,6}$ \} : Angular velocity at each joint axis
* $\vec{v_t}$: 3-dimensional translational velocity vector of TCP $(v_{tx},v_{ty},v_{tz})$
* $\vec{w_t}$: 3-dimensional rotational velocity vector of TCP $(w_{tx},w_{ty},w_{tz})$

Thus,

$$
\vec{\omega}= ( \omega_1, \omega_2 , \omega_3 , \omega_4 , \omega_5 , \omega_6  ) ^T
$$
$$
\vec{v}=
\left(
\begin{array}{c}
 {\vec{v_t}^T} \\
 {\vec{w_t}^T} \\
 \end{array}
\right)
$$
is represented.

The Jacobian matrix $J$ is determined by the instantaneous posture of the robot arm, but its inverse matrix $J^{-1}$ may not be obtainable. In this case, regardless of the instantaneous movement $\vec{v}$ of the TCP, the instantaneous rotation $\vec{\omega}$ of the joint axis becomes indeterminate. When determining the elements of the inverse matrix, division by the determinant is necessary, so not being able to obtain $J^{-1}$ means that the determinant is 0, i.e.,
$$
\rm{det}[J] = 0
$$
This is precisely the posture that takes a singularity. On the other hand, in postures near a singularity, the determinant $\rm{det}[J]$ is close to but not zero. Therefore, $J^{-1}$ can be obtained, but its elements can become enormous because they are divided by the minute $\rm{det}[J]$. Therefore, when calculating
$$
\vec{\omega} =J^{-1} \vec{v}
$$
even if the movement $\vec{v}$ of the TCP is small, the elements of the change in joint angle $\vec{\omega}$ can become enormous. This is why some parts of the arm exhibit abnormal behavior near singularities.

## Singularity Avoidance
### Main Avoidance Methods
As mentioned above, there are problems with movement near singularities, so methods have been devised to somehow avoid these singularities. The main methods are as follows:

1. Slightly change the original trajectory (TCP path or orientation) when approaching a singularity.
2. Rapidly reduce the speed of all motors uniformly when approaching a singularity without changing the original trajectory.

In method 1, the operation proceeds according to the planned time, but accuracy is compromised due to deviation from the original trajectory. In method 2, the planned trajectory is accurately followed, but the operation is significantly delayed compared to the initially planned time.

Since industrial robot manipulators are often used in production sites such as factories, the issue of time-saving is important. Also, if careful programming is done to avoid singularities in important trajectories requiring accuracy, and only become singularities in simple tool movement scenes, method 1 is acceptable. Therefore, this article explains a method of singularity avoidance using "singularity low-sensitivity motion decomposition," an example of method 1 that was actually adopted (see Reference 1).

### Singularity Avoidance by Singularity Low-Sensitivity Motion Decomposition

#### Overview of the Method

Reference 1 introduces a method of introducing a low-sensitivity motion decomposition matrix $J^{*}$ to slightly change the original trajectory (TCP path or orientation) when approaching a singularity. The way of changing (sensitivity) can be finely adjusted with parameters. The specific calculation method when applying this method to a 6-axis manipulator is explained. The reference document generally mentions any multi-joint manipulator, and $J$ is not necessarily a square matrix, so it is replaced with a generalized inverse matrix (pseudo matrix) for discussion. However, since $J$ and $J^{-1}$ are square matrices in this article, they are used without replacement.

The outline of this method is as follows:

From the condition to minimize the error between the exact TCP position and orientation, a low-sensitivity motion decomposition matrix $J^{*}$ for performing low-sensitivity motion decomposition can be derived. By using this instead of $J^{-1}$ during trajectory generation, it is possible to operate in such a way that sacrifices the "orientation" accuracy of the TCP while maintaining the "position" accuracy of the TCP near singularities. As a result, singularities can be successfully avoided. At this time, no joint axis undergoes unexpected rapid acceleration and operates smoothly. Incidentally, $J^{*}$ completely matches $J^{-1}$ when moving away from the vicinity of a singularity.

#### Low-Sensitivity Motion Decomposition Matrix $J^*$

The derivation is omitted, and the definition of the low-sensitivity motion decomposition matrix $J^{*}$ is shown below.

$$
J^{*}=N_{\theta}^{-1}\hat{J}^{T}(\hat{J}\hat{J}^{T} + kI)^{-1}N_{r} 
$$
where
$$
\begin{align*}
& \hat{J}= N_r J N_{\theta}^{-1}\\
& k=k_f(k_0, w_0, w_f(J)) \\
& w_f(J)=|\rm{det}[J]| 

\end{align*}
$$
Furthermore,

* $N_θ$ : 6x6 diagonal matrix determining the sensitivity of joint axis motion
  * Default value: $\rm{diag}(1,1,1,1,1,1)$
* $N_r$ : 6x6 diagonal matrix determining the sensitivity of TCP motion
  * Default value: $\rm{diag}(a,a,a,b,b,b)$
  * Here, $a=1/V_{max},\quad b=1/W_{max}$
  * $V_{max}$: Maximum translational speed of TCP in design specifications
  * $W_{max}$: Maximum rotational speed of TCP in design specifications
* $k$: Nakamura's index indicating whether the robot arm's posture is close to a singularity
  * $k_0$ at a singularity, asymptotically approaching 0 when away from a singularity
  * Defined as follows

$$
k=k_f(k_0,w_0,w) = \left  \{
\begin{array}{}
k_0(1-|w/w_0|)^2 & \rm{if}(|w/w_0|<1) \\
0 & \rm{else}  
\end{array}
\right.
$$

  * The graph outline of the above function $k_f()$ (horizontal axis: $w$, vertical axis: $k$) is shown below.
  
      ![](/img/robotics/manip-algo3/kf.png)


Here, $k_0$ and $w_0$ are control adjustment values determined by the following guidelines.

* $k_0$
  * Adjustable between 0.0 and 1.0. Default value: 0.01
  * Increasing it reduces the sensitivity of $θ$ to TCP movement near singularities. While it alleviates sudden acceleration of some axes, it tends to deviate from the target trajectory.
  * Decreasing it improves adherence to the target trajectory.
  
* $w_0$
  * Boundary reference value separating singular and non-singular regions
  * Calculated as $w_0=w_f(J_0)$. It is good to use the Jacobian matrix calculated for the posture when $θ_5$ is changed to about 10° to 30° from the Wrist singularity posture ($θ_5$=0°).

#### Trajectory Generation Algorithm Using $J^{*}$
The specific method for trajectory generation that can avoid singularities using $J^{*}$ is explained.

First, for a posture composed of a certain set of joint angles $\vec{\theta_\tau}$, the calculated $J^*$ is expressed as a function
$$
J^{*}=J^*(\vec{\theta_\tau})
$$
Also, let $t$ be the time, and
* $\vec{\theta}_{(t)}$: Time series of joint angles to be taken
* $\vec{v}_{(t)}$: Time series of 6-dimensional column vector representing TCP velocity
* $\Delta t$: Small time interval

Then, theoretically, the recurrence formula including the following integral
$$
\vec{\theta}_{(t+\Delta t)}=\int_{\tau=t}^{t+\Delta t}{J^*(\vec{\theta}_{(\tau)})\vec{v}_{(\tau)}}d\tau + \vec{\theta}_{(t)}
$$
can be calculated to output a set of joint angles that can generate a trajectory capable of avoiding singularities in real-time. However, in practice, it is difficult to accurately calculate $\vec{v}_{(t)}$. Even if the original velocity $\vec{v}^O_{(t)}$ calculated from the original trajectory (trajectory calculated by the previously described trajectory generation method) is considered as $\vec{v}_{(t)}$ and the above integral is performed to obtain a new $\vec{\theta}_{(t)}$, it will deviate more and more from the original course each time it passes near a singularity.

For example, as shown in the diagram below, when actually at the point $P(\tau)$ on the course, if the TCP moves with the original velocity $\vec{v}^{O}$ that should be taken on the original course, it will continue to move off the course, so it will be further away from the planned target point $P'(t+\Delta t)$ at the next time point. To avoid this, it is necessary to move while deviating by the recovery velocity $\vec{v}^{reg}$ to return exactly to the planned course. Note that $\vec{v}^{reg}$ is the difference between the target velocity $\vec{v}^{tgt}$ for moving accurately to the target point from the current point and the original velocity $\vec{v}^{O}$.
 
![](/img/robotics/manip-algo3/SPA_proc.png)

Based on the above concept, the following calculations using feedback control are performed to ensure that the original course can always be returned to even if deviated.

First, define $\vec{v}_{(\tau)}$ as follows.
$$
\vec{v}_{(\tau)}=\vec{v}^{O}_{(\tau)} + G(\vec{\theta}_{(\tau)}) \vec{v}^{reg}_{(\tau)}
$$

Here, $\tau$ is the time between [ $t$ to $t+\Delta t$ ], and if $FK(\vec{\theta})$ is the operation to find the TCP coordinates from the joint angles, that is, the forward kinematics operation, then
$$
\vec{v}^{tgt}_{(\tau)}=\frac{FK(\vec{\theta}^{O}_{(t+\Delta t)})-FK(\vec{\theta}_{(\tau)})}{t+\Delta t - \tau}
$$
$$
\vec{v}^{O}_{(\tau)}=\frac{FK(\vec{\theta}^{O}_{(t+\Delta t)})-FK(\vec{\theta}^{O}_{(t)})}{\Delta t}
$$

$$
\vec{v}^{reg}_{(\tau)}=\vec{v}^{tgt}_{(\tau)}-\vec{v}^{O}_{(\tau)}
$$

$$
G(\vec{\theta})=g_0 
\left(
  \frac{1-k_f(k_0,w_0,w_f(J(\vec{\theta})))}{k_0}
\right) ^{\rho}
$$

In this, $\vec{v}^{O}_{(\tau)}$ is the velocity when the TCP is moving along the original course, $\vec{v}^{tgt}_{(\tau)}$ is the target velocity for the TCP to move straight to the next original position/orientation, and $\vec{v}^{reg}_{(\tau)}$ is the recovery velocity for the TCP to approach the original course. Also,

 * $G(\vec{\theta}）$ is the Gain value for returning to the target TCP trajectory (0.0 to 1.0). Near singularities, G approaches 0.
  ![](/img/robotics/manip-algo3/funcG.png)
 * $\rho$ is set to 2.0. 
 * $g_0$ is the recovery coefficient. Default value: 0.0001 
* $\Delta t$ is the same as the sample time for trajectory generation.

Using the above, the previous integral can be calculated. However, in practice, the following approximation, which simplifies this integral, can be used. This allows the output of joint angle sets that can return to the original course in real-time.
$$
\vec{\theta}_{(t+\Delta t)}={J^*(\vec{\theta}_{(t)})\vec{v}_{(t)}}\Delta t + \vec{\theta}_{(t)}
$$

Note that when passing through a singularity, the course may slightly shift sideways even if a linear course is expected. In this case, the course deviation can be adjusted by adjusting the values of $k_0$, $w_0$, or $V_{max}$, $W_{max}$. Also, note that if the value of $g_0$ is large, the course may oscillate.

## 3. Conclusion

I explained what singularities of robot arms are and how to avoid singularities in 6-axis robot arms. In actual system implementation, parameter adjustments are made by operating these on actual machines. Also, in practice, functions such as singularity avoidance during JOG operation using a pendant and singularity detection alarm functions are also required separately. However, these can be implemented by applying the theory in this article.

## References

1. Hitoshi Nakamura, Hidero Hanabusa, ","Singularity Low-Sensitivity Motion Decomposition for Joint-Type Robot Arms," Transactions of the Society of Instrument and Control Engineers, Vol. 20, No. 5 (May 1984)
2. Shigeki Toyama (Author), "Robotics (Mechatronics Textbook Series)," Corona Publishing (1994)
