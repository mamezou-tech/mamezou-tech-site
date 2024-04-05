---
title: Algorithms for Controlling Robot Manipulators 2
author: takahiro-ishii
date: 2024-03-26T00:00:00.000Z
tags:
  - Robot
  - Manipulator
  - Algorithm
  - Trajectory Generation
  - Inverse Kinematics
  - Jacobian Matrix
  - Homogeneous Matrix
  - Quaternion
  - Slerp
  - Spherical Linear Interpolation
  - Smooth
  - Smooth Trajectory
  - Attitude Change
  - Velocity Overlay
  - Velocity Profile
  - Velocity Vector
image: true
prevPage: ./src/posts/robotics/manip-algo/manip-algo.md
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/robotics/manip-algo2/manip-algo2/).
:::



# Algorithms for Controlling Robot Manipulators 2
Mamezou Co., Ltd. Engineering Solutions Division, Takahiro Ishii

## 1. Introduction
Mamezou Co., Ltd. develops various robotic technologies. While we often develop applied technologies that meet client demands using robots from other companies, we also develop industrial robots with 6 or 7-axis arms, known as robot arms or manipulators, from scratch. Through this development, we have produced various applied technologies and proposals. In this article, I would like to share the knowledge gained from this development with the readers. This explanation will describe various mechanisms for controlling a 6-axis industrial vertical articulated manipulator, using it as an example.

This time, we introduce an example of the detailed trajectory generation processing algorithm explained last time. Specifically, we will discuss how to interpolate the distinctive positions and attitudes specified by the user to calculate samples of trajectories (sets of positions and attitudes).

## 2. Trajectory Generation
## Interval Setting
In robot programming, the important points KP (Key Points) through which the tool tip's trajectory passes are specified continuously in terms of position and attitude. Furthermore, the shape of the trajectory within the interval between KPs, as well as the speed and acceleration, are also specified. These are used to sample positions and attitudes to form a trajectory $T_i$.

KP is also expressed using the same definition of the tool tip's position and attitude as mentioned previously. Here, the sequence number of KP on the trajectory is denoted by $j$ ($j$ is a non-negative integer).

$$T_{KP[j]}=\left(
\begin{array}{cccc}
 u_x & v_x & w_x & q_x \\
 u_y & v_y & w_y & q_y \\
 u_z & v_z & w_z & q_z \\
 0 & 0 & 0 & 1 \\
\end{array}
\right)$$

To reiterate, the upper left 3x3 submatrix $R_{KP[j]}$ (orthonormal system) represents the attitude/direction of the tool tip coordinate system from the base coordinate system $\Sigma_0$. The fourth column represents the origin position. Thus, the direction of the $j$th tool tip coordinate system XYZ axes is

$$
\begin{align*}
& \vec{X_j} = ( u_x,u_y,u_z ) \\
& \vec{Y_j} = ( v_x,v_y,v_z ) \\
& \vec{Z_j} = ( w_x,w_y,w_z ) \\
& |\vec{X_j}| = |\vec{Y_j}| =|\vec{Z_j}| =1 \\
& \vec{X_j} \cdot  \vec{Y_j} =\vec{Y_j} \cdot \vec{Z_j} = \vec{Z_j} \cdot \vec{X_j}=0 \\

\end{align*}
$$
and the position is
$$
\vec{P}_{KP[j]} = ( q_x,q_y,q_z )
$$

If necessary, $T_{KP[j]}$ can be obtained using forward kinematics from the 6-axis joint angle vector $\Theta_j$. Additionally, the attitude $R_{KP[j]}$ can be derived from Euler angles.

Once the trajectory between KPs is determined and its distance is set, the velocity and acceleration can be used to determine the trapezoidal velocity profile explained previously.

The following explains the method of generating trajectories for each shape. The actual process is complicated, so here we will only explain the concept without going into specific processing methods.

## Intra-Interval Position Trajectory
### Straight Line
Consider connecting KPs in 3D space with a straight line.

![](./img/robotics/manip-algo2/line.png)
For the interpolation interval number $m$ ($m$ is a non-negative integer) between KP$_{[m]}$ and KP$_{[m+1]}$, using the parameter $s$ (>0.0), the straight-line interpolation formula becomes

$$\vec{F}(s) = (1-(s-m))*\vec{P}_{KP[m]} + (s-m)*\vec{P}_{KP[m+1]}　$$

$$ m= \rm{floor}(s)$$

Sampling this formula, i.e., dividing $s$ appropriately and calculating $\vec{F}(s)$, yields the trajectory of positions. Note that at KP$_{[m]}$ (when $s=m$), the positions match, so this trajectory passes through KP.

### Spline Curve
When 3 or more KPs, or in other words, 2 or more consecutive intervals are specified, a smooth 3D trajectory of positions can be obtained through piecewise cubic spline interpolation.

![](./img/robotics/manip-algo2/spline.png)

First, for interval $m$, define the piecewise cubic spline interpolation formula with parameter $s$ as follows.

$$\vec{F}_m(s) = \vec{a}_m + \vec{b}_m*(s-m) + \vec{c}_m*(s-m)^2 + \vec{d}_m*(s-m)^3 　$$

Set up a system of equations for any $m$ so that the following conditions are met, and solve the equations with coefficients $\vec{a}_m, \vec{b}_m, \vec{c}_m, \vec{d}_m$ as unknowns. This solution can be uniquely calculated.

1. 0th order continuity:
    
	$$\vec{P}_{KP[m]}=\vec{F_m}(m);~ \vec{P}_{KP[m+1]}=\vec{F_m}(m+1);~... $$

2. 1st order continuity: The slope of the tangent at KP is continuous
   
	$$\frac{d\vec{F}_{m-1}(m)}{ds}=\frac{d\vec{F}_{m}(m)}{ds};~ \frac{d\vec{F}_m(m+1)}{ds}=\frac{d\vec{F}_{m+1}(m+1)}{ds} ;~...　
	$$

3. 2nd order continuity: The curvature at KP is continuous
   
	$$\frac{d^2\vec{F}_{m-1}(m)}{ds^2}=\frac{d^2\vec{F}_{m}(m)}{ds^2};~ \frac{d^2\vec{F}_m(m+1)}{ds^2}=\frac{d^2\vec{F}_{m+1}(m+1)}{ds^2};~... $$

4. At the starting KP and ending KP, the slope of the tangent is undefined, and the curvature is set to 0.

After determining the coefficients and calculating $\vec{F}_m(s)$ by sampling $s$, a smooth 3D curve that penetrates KP is obtained. Here,
$$m=\rm{floor}(s)$$
is used. This trajectory is a smooth 3D curve that penetrates KP.

### Arc
When 3 KPs are specified, or in other words, 2 consecutive intervals are specified, a smooth 3D arc trajectory can be obtained. The center and radius of the circle passing through the 3 points are determined, and sampling based on the angle of movement from the center allows for the calculation of the arc trajectory.

![](./img/robotics/manip-algo2/arc.png)

Actually, performing this calculation straightforwardly in 3D space is difficult, so it is considered by projecting it onto 2D first. In the figure below, the UV coordinate system is arranged so that KP$_{[m]}$ is the origin, KP$_{[m-1]}$ lies on the U axis, and KP$_{[m+1]}$ lies on the UV plane.

![](./img/robotics/manip-algo2/arc2d.png)

Formalizing this results in the following.
$$\vec{v}_a=\vec{P}_{KP[m-1]}-\vec{P}_{KP[m]}$$
$$\vec{v}_b=\vec{P}_{KP[m+1]}-\vec{P}_{KP[m]}$$
$$\vec{U}=\vec{v}_a/|\vec{v}_a|$$
$$\vec{W}=\frac{\vec{v}_a \times \vec{v}_b}{|\vec{v}_a||\vec{v}_b|}$$
$$\vec{V}=\vec{W} \times \vec{U} $$

This allows for the calculation of the 4x4 homogeneous matrix $T^{WC}_{UV}$ for transforming from the UVW coordinate system to the $\Sigma_0$ coordinate system. In other words, insert $\vec{U},\vec{V},\vec{W}$ into the rotation matrix part of the matrix, and $\vec{P}_{KP[m]}$ into the translation part.

Furthermore, the angle formed by $\vec{v}_a$ and $\vec{v}_b$ can be calculated using the formula for the dot product. Then, on the UVW coordinate system, the 2D coordinates $Q_0,Q_1,Q_2$ of the 3 KPs can be determined. Thus, the radius $R$ and center coordinates $Q_c(U_c, V_c)$ of the circle passing through these 3 points can be analytically derived on the UVW coordinate system. Similarly, the rotational movement angles $th_0$ and $th_2$ around $Q_c$ can also be calculated.
Here, as shown in the figure, the uv coordinate system is defined with $Q_c$ as the origin and the u-axis directed towards $Q_1$. On the UVW coordinate system, the u-axis, v-axis, and w-axis are respectively
$$
\begin{align*}
& \vec{u}= (-U_c/R, -V_c/R,0 ) \\
& \vec{v}= ( V_c/R, -U_c/R,0) \\
& \vec{w}= (0,0,1)
\end{align*}
$$
This allows for the calculation of the homogeneous transformation matrix $T^{UV}_{uv}$ for transforming from the uv coordinate system to the UVW coordinate system.

Thus, the homogeneous transformation matrix $T^{WC}_{uv}$ from the uv coordinate system to the base coordinate system $\Sigma_0$ is
$$T^{WC}_{uv} = T^{WC}_{UV} T^{UV}_{uv}$$
which can be calculated.

Now, on the uv coordinate system, the parametric representation of the arc starting from $Q_0$ is
$$ 
\left(
\begin{array}{ccc}
u \\ v \\ w
\end{array}
\right)
=　\left(
\begin{array}{ccc}
R~ \rm{cos}(-\theta) \\
R~ \rm{sin}(-\theta)\\
0
\end{array}
\right)

$$
Thus, by sampling $\theta$ from $-th_0$ to $th_2$ and using $T^{WC}_{uv}$ for coordinate transformation, the sample points of the arc in 3D space can be calculated.

## Intra-Interval Attitude Trajectory
So far, we have explained methods for deriving or interpolating trajectories that are intuitively understandable for the tool tip "position". In contrast, "attitude" also needs to be interpolated continuously between KPs, forming an important part of the sample information for constructing a trajectory. "Attitude" refers to the upper left 3x3 rotation matrix part $R$ of the 4x4 homogeneous matrix representing the state of the tool tip, consisting of 9 numerical values as already explained. Interpolating these 9 numerical values while maintaining an orthonormal system between attitudes is challenging. Therefore, traditionally, these 9 numerical values were converted into Euler angles, i.e., a vector representing three angles, and the angle vectors were interpolated appropriately. However, this method did not result in natural interpolation due to the anisotropy of the three angles, and dealing with gimbal lock was difficult.

As a result, in recent years, it has become common to represent attitudes and rotational operations in 3D space at KPs using quaternions $\bold{q}$ (Quaternion) and to perform interpolation processing between them. Unit quaternions of length 1 are used to represent rotation.

The procedure for performing interpolation processing is as follows.

1. Convert the rotation matrices $R$[m],$R$[m+1],... representing attitudes at KPs[m],KP[m+1],... belonging to interval m into quaternions $\bold{q}_{[m]}$, $\bold{q}_{[m+1]}$, ...
2. Interpolate between $\bold{q}_{[m]}$, $\bold{q}_{[m+1]}$, ... to smoothly generate samples $\bold{q}_{[m]}(s_i)$
3. Sequentially reverse convert $\bold{q}_{[m]}(s_i)$ into $R_{[m]}(s_i)$

As a reference, the following shows an example code for converting from $R$ to $\bold{q}$.
```cpp
///////////////////////////////////////////////////////////
/// @brief		Set quaternion from a 3x3 matrix
/// @param[in]	_matrix
/// @return		None
/// @note
///////////////////////////////////////////////////////////
void Quaternion::SetR3x3(const Matrix& _matrix)
{
	const double m11=_matrix.At(0, 0), m12=_matrix.At(0, 1), m13=_matrix.At(0, 2);
	const double m21=_matrix.At(1, 0), m22=_matrix.At(1, 1), m23=_matrix.At(1, 2);
	const double m31=_matrix.At(2, 0), m32=_matrix.At(2, 1), m33=_matrix.At(2, 2);

	// Search for the maximum component of w ( =q1 )
	double q[4]; // Candidates for w 0:w, 1:x, 2:y, 3:z
	q[0] =  m11 + m22 + m33 + 1.0;
	q[1] =  m11 - m22 - m33 + 1.0;
	q[2] = -m11 + m22 - m33 + 1.0;
	q[3] = -m11 - m22 + m33 + 1.0;

	int imax = 0;
	for ( int i=1; i<4; i++ ) {
		if ( q[i] > q[imax] ) imax = i;
	}
	if( q[imax] < 0.0 ){
		assert(0);
		m_quat1 = 1.0; m_quat2 = 0.0; m_quat3 = 0.0; m_quat4 = 0.0;
		return;
	}
	// Calculate the value of the maximum element
	const double v = sqrt( q[imax] )*0.5;
	q[imax] = v;
	const double kc = 0.25/v;
	switch ( imax ) {
	case 0: // w
		q[1] = (m32 - m23) * kc;
		q[2] = (m13 - m31) * kc;
		q[3] = (m21 - m12) * kc;
		break;
	case 1: // x
		q[0] = (m32 - m23) * kc;
		q[2] = (m21 + m12) * kc;
		q[3] = (m13 + m31) * kc;
		break;
	case 2: // y
		q[0] = (m13 - m31) * kc;
		q[1] = (m21 + m12) * kc;
		q[3] = (m32 + m23) * kc;
		break;
	case 3: // z
		q[0] = (m21 - m12) * kc;
		q[1] = (m13 + m31) * kc;
		q[2] = (m32 + m23) * kc;
		break;
	}
	m_quat1 = q[0];
	m_quat2 = q[1];
	m_quat3 = q[2];
	m_quat4 = q[3];
}
```
Also, the following shows an example code for the reverse conversion.
```cpp
///////////////////////////////////////////////////////////
/// @brief		Calculate and output a 3x3 rotation matrix from a quaternion
/// @param[out]	_matrix
/// @return		None
/// @note
///////////////////////////////////////////////////////////
void Quaternion::GetR3x3(Matrix& _matrix) const
{
	assert(_matrix.GetRow() >= 3);
	assert(_matrix.GetCol() >= 3);

	const double qw = m_quat1;
	const double qx = m_quat2;
	const double qy = m_quat3;
	const double qz = m_quat4;

	double qxy = 2.0*qx*qy;
	double qyz = 2.0*qy*qz;
	double qxz = 2.0*qx*qz;

	double qwx = 2.0*qw*qx;
	double qwy = 2.0*qw*qy;
	double qwz = 2.0*qw*qz;

	double qxx = 2.0*qx*qx;
	double qyy = 2.0*qy*qy;
	double qzz = 2.0*qz*qz;

	double &m11=_matrix.At(0, 0), &m12=_matrix.At(0, 1), &m13=_matrix.At(0, 2);
	double &m21=_matrix.At(1, 0), &m22=_matrix.At(1, 1), &m23=_matrix.At(1, 2);
	double &m31=_matrix.At(2, 0), &m32=_matrix.At(2, 1), &m33=_matrix.At(2, 2);

	m11 = 1.0 - qyy - qzz;
	m21 = qxy + qwz;
	m31 = qxz - qwy;

	m12 = qxy - qwz;
	m22 = 1.0 - qxx - qzz;
	m32 = qyz + qwx;

	m13 = qxz + qwy;
	m23 = qyz - qwx;
	m33 = 1.
