---
title: TresJS - Three.js を Vue components として利用する
author: masahiro-kondo
date: 2023-06-18
tags: [tresjs, vue]
---

## TresJS とは
TresJS は Vue.js のアプリで [Three.js](https://threejs.org/) を用いたシーンのレンダリングを行うためのライブラリです。Vue の構文で宣言的にシーンを記述できます。

[TresJS | The solution for 3D on VueJS](https://tresjs.org/)

Three.js は ブラウザで手軽に 3D グラフィックスを扱える優れたライブラリです。シーンのオブジェクトグラフを構築しそのオブジェクトグラフをレンダラーに渡して描画するという命令型のプログラミングスタイルです。TresJS は Three.js による開発に以下のメリットをもたらします。

- Vue components による宣言的なシーン構築
- Powerd by Vite: HMR(Hot Module Replacement) も利用可能
- Three.js の(頻繁な)アップデートに追従
- (後述の Cientos など)独自の拡張ライブラリによるエコシステム

:::info
React にも同様なコンセプトのライブラリ react-three-fiber があります。

[GitHub - pmndrs/react-three-fiber: 🇨🇭 A React renderer for Three.js](https://github.com/pmndrs/react-three-fiber)
:::

TresJS の GitHub リポジトリは以下です。現在は v2 です。

[GitHub - Tresjs/tres: Declarative ThreeJS using Vue Components](https://github.com/tresjs/tres)

TresJS のドキュメントは以下にあります。

[Introduction | TresJS](https://tresjs.org/guide/)

:::info
[Tres のオーガニゼーション](https://github.com/Tresjs)には Nuxt へのインテグレーションである @tresjs/nuxt のリポジトリもあります。

[GitHub - Tresjs/nuxt: TresJS integration for Nuxt.](https://github.com/Tresjs/nuxt)
:::

StackBlitz でサンプルのデモを Vue + Vite プロジェクトのソースコードとともに見ることができます。

[TresJS ▲ ■ ● by alvarosabu - StackBlitz](https://stackblitz.com/@alvarosabu/collections/tresjs)

TresJS Playground ではさらに高度なデモが公開されています。

[TresJS Playground](https://playground.tresjs.org/)

:::column:TresJS 作者の開発動機
TresJS のガイドに作者の開発動機が書かれています。

[Motivation | TresJS](https://tresjs.org/guide/#motivation)

まず Three.js は常に更新されるライブラリであるため追従が困難なのでラッパー側で対応したい。React エコシステムには React-three-fiber がある。Vue には [Runchbox](https://github.com/breakfast-studio/lunchboxjs) という[カスタム Vue3 Renderer](https://vuejs.org/api/custom-renderer.html) を作成するためのライブラリがあり、作者もこのライブラリにコミットしていたそうです。作者はこの2つのライブラリにインスパイアされて TresJS を開発したそうです。素晴らしいですね。
:::

## TresJS プロジェクトの作成

Starter プロジェクトのリポジトリと [degit](https://www.npmjs.com/package/degit) を使ってプロジェクトを作成できます。tresjs-trial という名前で作成しました。

```shell
npx degit tresjs/starter tresjs-trial
```

作成されたプロジェクトは以下のような構造になっており、Vue + Vite + TypeScript ベースのプロジェクトになっています。

```
.
├── index.html
├── package.json
├── public
├── src
│   ├── App.vue
│   ├── components
│   │   ├── TheExperience.vue
│   │   ├── TheModel.vue
│   │   └── TheText.vue
│   ├── main.ts
│   ├── style.css
│   └── vite-env.d.ts
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

以下で開発サーバーが起動します。

```shell
cd tresjs-trial
npm install
npm run dev
```
デフォルトでは、立方体が回転するシーンがレンダリングされます。

![Cube](https://i.gyazo.com/3a3e3d0019c7b1a6d1b93a64e5ea5702.png)

## 宣言的な3Dシーン定義
生成されたプロジェクトの src/components/TheExperience.vue にシーン構築のコードがあるので引用します(import 文などを省略しています)。

```html
<script setup lang="ts">
// 中略
const { onLoop } = useRenderLoop()
const boxRef = shallowRef(null)

onLoop(({ elapsed }) => {
  if(boxRef) {
    boxRef.value.rotation.y = elapsed
    boxRef.value.rotation.z = elapsed
  }
})
</script>

<template>
  <TresCanvas v-bind="state">
    <TresPerspectiveCamera :position="[5,5,5]" />
    <OrbitControls />
    <TresAmbientLight :intensity="0.5" :color="'red'" />
    <TresMesh ref="boxRef" :position="[0,2,0]">
      <TresBoxGeometry :args="[1,1,1]" />
      <TresMeshNormalMaterial />
    </TresMesh>
    <TresDirectionalLight :position="[0, 2, 4]" :intensity="1" cast-shadow />
    <TresAxesHelper />
    <TresGridHelper :args="[10, 10, 0x444444, 'teal']" />
  </TresCanvas>
</template>
```
Three.js の Camera や OrbitControls が Vue コンポーネントとして宣言的に利用可能になっていることがわかります。TresCanvas や TresMesh など独自のヘルパータグにより宣言的なシーンのレンダリングを可能にしています。Three.js の Render Loop を利用する useRenderLoop のメソッドを使って、定期的に画面を更新して立方体を回転させています。

コードの全体は以下のリポジトリで参照できます。

[GitHub - Tresjs/starter: Starter repo template for TresJS applications](https://github.com/Tresjs/starter)

:::info
Three.js を生で使うとどうだったか実例を見てみましょう。Three.js のドキュメントからチュートリアルのコードを引用します。TresJS Starter プロジェクトとほぼ同様な立方体が回転しているシーンをレンダリングするためのコードは以下のようになります。3Dシーンのオブジェクトグラフを Web の DOM ツリーとして扱う API を駆使していることがわかります。

[Creating a scene | three.js docs](https://threejs.org/docs/#manual/en/introduction/Creating-a-scene)

```html
<!DOCTYPE html>
<html>
	<head lang="en">
		<meta charset="utf-8">
		<title>My first three.js app</title>
		<style>
			body { margin: 0; }
		</style>
	</head>
	<body>
		<script type="module" src="/main.js"></script>
	</body>
</html>
```

```javascript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

function animate() {
	requestAnimationFrame( animate );

	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

	renderer.render( scene, camera );
}

animate();
```
:::

## ティーポットを表示してみる
Three.js では WebGL の標準ファイルフォーマット [glTF](https://www.khronos.org/gltf/) をシーンに読み込むための GLTFLoader が提供されています。TresJS からこの GLTFLoader を利用できます。これを使って有名な3Dモデルである[ティーポット](https://ja.wikipedia.org/wiki/ユタ・ティーポット)を表示して回転させてみようと思います。

TresJS の拡張ライブラリに Cientos というパッケージがあります。

[Cientos | Cientos](https://cientos.tresjs.org/)

このライブラリに、GLTFLoader をラップした GLTFModel というメソッドがあります。利用方法は以下のドキュメントにあります。

[Using GLTFModel | Cientos](https://cientos.tresjs.org/guide/loaders/gltf-model.html)

WebGL や Vulkan などのグラフィックス API の規格を作成している Khronos Group Inc で公開されているティーポットのモデルをダウンロードして利用します。

[https://raw.githubusercontent.com/KhronosGroup/Vulkan-Samples-Assets/main/scenes/teapot.gltf](https://raw.githubusercontent.com/KhronosGroup/Vulkan-Samples-Assets/main/scenes/teapot.gltf)


```html
<script setup lang="ts">
import { TresCanvas, useRenderLoop } from '@tresjs/core';
import { reactive, shallowRef } from 'vue';
import { OrbitControls, GLTFModel, useTweakPane } from '@tresjs/cientos';

const state = reactive({
  clearColor: 'black',
  shadows: true,
  alpha: false,
});

const { onLoop } = useRenderLoop();

const groupRef = shallowRef(null);

onLoop(({ elapsed }) => {
  if(groupRef) {
     groupRef.value.rotation.y = elapsed;
  }
});

useTweakPane();
</script>

<template>
  <TresCanvas v-bind="state">
    <TresPerspectiveCamera :position="[70, 20, 50]" />
    <OrbitControls />
    <TresGroup ref="groupRef" >
      <Suspense>
        <GLTFModel path="models/teapot.gltf" draco />
      </Suspense>
    </TresGroup>
    <TresDirectionalLight :position="[-2, 15, 9]" :intensity="8.5" cast-shadow />
  </TresCanvas>
</template>

```

はい。動きました。Starter の立方体と同じように、useRenderLoop を使ってティーポットをY軸を中心に回転させています。FPS(frames per second) を表示するパネルも表示させています。

![teapot](https://i.gyazo.com/30fb1a0fbd5f1885efc20ca4e87018c9.gif)

:::info
上記のコードで利用している `Suspense` タグは Vue.js の実験的なフィーチャーで、コンポーネントの非同期的な依存を制御するためのコンポーネントです。

[Suspense | Vue.js](https://vuejs.org/guide/built-ins/suspense.html#suspense)
:::

## 最後に
[WebGPU](https://www.w3.org/TR/webgpu/) の登場により、ブラウザでの 3D CG 利用が促進されることが予想されます。Three.js も WebGPU 対応を表明している模様です。Three.js のような独自色が強いライブラリが Vue のように普段アプリ開発で馴染んでいるフレームワークのコンポーネントとして利用できることで、今後の需要増加にも対応できそうですね。何より 3Dシーンを構築するのは楽しいですし。
