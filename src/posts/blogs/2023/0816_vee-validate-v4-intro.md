---
title: Vue3ベースのバリデーションフレームワークVeeValidate(v4)を使う
author: noboru-kudo
date: 2023-08-16
tags: [vee-validate, vue, zod, nuxt]
---

Vue2ユーザーの皆さん、Vue3への移行はお済みでしょうか？[^1]

[^1]: 移行のハードルが高すぎて、他のフレームワークに変えたプロジェクトも多いという噂も聞きますが。

今回はこの移行で悩ましいバリデーションフレームワークのお話です。
Vueで代表的なバリデーションフレームワークと言えば[VeeValidate](https://vee-validate.logaretm.com/v4/)があります。
VeeValidateは多機能で使いやすいフレームワークですが、Vue2系に対応するv3とVue3系に対応するv4では、別物と言ってもいいくらい使い方が変わっています。

今回はそんなVeeValidate v4の使い方を整理したいと思います。

:::info
本記事の内容は、以下バージョンで検証しています(執筆時点の最新バージョン)。
Nuxt(Vue3): v3.6.5
VeeValidate: v4.11.1
:::

## VeeValidateの利用スタイル

VeeValidate(v4)の利用には、以下2つの実装スタイルがあります。

- [Composition API](https://vee-validate.logaretm.com/v4/guide/components/validation/)
- [Higher-order components (HOC)](https://vee-validate.logaretm.com/v4/guide/composition-api/getting-started/)

1つ目のComposition APIは、VeeValidateが提供するComposableを使う方法です。
特定のUIをもたないので、既存のコンポーネントに組み込むなどの柔軟な使い方ができます。

2つ目のHigher-order componentsはVeeValidateが提供するVueコンポーネント(Form/Field等)を使う方法です。
Composition APIを直接使うよりもシンプルに実装できます。
とはいえ、内部的にはこれらコンポーネントの実装は上述のComposition APIを使ったもので、それ以上のことはできません。

両者は排他的なものではありませんので、適材適所で使い分けできます。

以降はそれぞれの使い方を簡単に見ていきます。

## Higher-order components (HOC)

まずは簡単な方からです。
前述の通りHigher-order componentsは、VeeValidateが提供するVueコンポーネントを使ったやり方です。

### フィールドレベルバリデーション

ほぼ公式ドキュメントそのままですが、最低限の実装は以下のようなものになります。

```html
<script setup lang="ts">
  import { Field, Form, ErrorMessage } from 'vee-validate';

  const isRequired = (value) => value && value.trim() ? true : '名前は必須ですよ！';
</script>

<template>
  <Form>
    <Field name="name" :rules="isRequired" />
    <ErrorMessage name="name" />
  </Form>
</template>
```

VeeValidateが提供するフォーム(`Form`)を配置して、子要素として入力フィールド(`Field`)やエラーメッセージ(`ErrorMessage`)を配置しています。
各コンポーネントは名前から役割は自明ですね。
肝心のバリデーションロジックはFieldの`rules`Propsで指定します。関数自体はOKの場合はtrue、NGの場合はエラーメッセージを返します。

これを実行すると、バリデーションエラー発生時は以下のようなHTMLがレンダリングされます。
```html
<form novalidate>
  <input name="name">
  <span role="alert">名前は必須ですよ！</span>
</form>
```

もちろんこれはあくまでデフォルト設定の場合です。コンポーネントのPropsやSlotを指定することでUIはカスタマイズできます。
詳細は各コンポーネントのAPIリファレンスで確認できます。

- [VeeValidate Doc - Form](https://vee-validate.logaretm.com/v4/api/form/)
- [VeeValidate Doc - Field](https://vee-validate.logaretm.com/v4/api/field/)
- [VeeValidate Doc - ErrorMessage](https://vee-validate.logaretm.com/v4/api/error-message/)

なお、バリデーションロジックはグローバル定義も可能です。利用頻度が高いものはこちらを利用する方が良いでしょう。

- [VeeValidate Doc - Global Validators](https://vee-validate.logaretm.com/v4/guide/global-validators/)


### フォームレベルバリデーション

先ほどは個々のフィールド(`Field`)に対してバリデーションルールを指定しましたが、フォーム(`Form`)単位でまとめてルールを指定する方法もサポートされています。
この場合は以下のような実装となります。

```html
<script setup lang="ts">
  import { ErrorMessage, Field, Form } from 'vee-validate';

  const schema = {
    lastName(value) {
      return value && value.trim() ? true : '苗字は必須ですよ！';
    },
    firstName(value) {
      return value && value.trim() ? true : '名前は必須ですよ！';
    }
  };
</script>

<template>
  <Form :validationSchema="schema">
    <Field name="lastName" />
    <ErrorMessage name="lastName" />
    <Field name="firstName" />
    <ErrorMessage name="firstName" />
  </Form>
</template>
```

先ほどのように個別のFieldコンポーネントの`rules`で指定するのではなく、Formコンポーネントの`validationSchema`に各フィールドのルールをまとめたオブジェクトを指定します。
一般的にはフィールドレベルでなくこちらを使う方がスッキリした形になるかと思います。

### バリデーションライブラリを使う

今まではバリデーションロジックを自作しましたが、VeeValidate v4では既存のバリデーションライブラリも組み込めます。

現状は[Yup](https://github.com/jquense/yup)と[Zod](https://github.com/colinhacks/zod)、[Valibot](https://valibot.dev/guides/introduction/)がサポートされています。
公式ドキュメントでは主にYupの方で記述されていますが、ここでは人気急上昇のZodで試してみます。
VeeValidateとは別に、ZodとVeeValidate公式のインテグレーションを導入します。

```shell
npm install zod @vee-validate/zod
```

先ほどのフォームレベルバリデーションの実装をZodで書き換えると以下のようになります。

```html
<script setup lang="ts">
import { ErrorMessage, Field, Form } from 'vee-validate';
import { z } from 'zod';
import { toTypedSchema } from '@vee-validate/zod';

const schema = toTypedSchema(
  z.object({
    lastName: z.string({ required_error: '苗字は必須ですよ！' }),
    firstName: z.string({ required_error: '名前は必須ですよ！' })
  })
);
</script>

<template>
  <Form :validationSchema="schema">
    <Field name="lastName" />
    <ErrorMessage name="lastName" />
    <Field name="firstName" />
    <ErrorMessage name="firstName" />
  </Form>
</template>
```

@vee-validate/zodの`toTypedSchema`でZodのスキーマをVeeValidateが解釈できる形に変換しています。

YupもZod等のライブラリは豊富なスキーマ定義を持っていますので、自作するのではなくこちらを使う方が簡単ですね。

### フォームサブミット

VeeValidate v3では、原則v-modelに指定した値に対してバリデーションしていました。
VeeValidate v4でもv-modelを使って同様のことはできますが、必須ではなくなりました。つまりフィールドの値はVeeValidateで管理します。
これはVeeValidateがフォームサブミットしていない値をアプリケーションで扱う必要性は少ないという考えを持っているからのようです。

このようにVeeValidate v4ではフォームサブミット機能をネイティブサポートしています。
フォームサブミットは、JavaScriptを単純に実行するものでも、HTMLデフォルトのページリロードを伴ってデータを送信するスタイルでも可能です。
両ケースでVeeValidateは、バリデーションがパスしていなければフォームサブミットを発動しないようにしてくれます(デフォルト)。

以下はフォームサブミットの実装例です。

```html
<script setup lang="ts">
import { ErrorMessage, Field, Form } from 'vee-validate';
import { z } from 'zod';
import { toTypedSchema } from '@vee-validate/zod';

const schema = toTypedSchema(
  z.object({
    lastName: z.string({ required_error: '苗字は必須ですよ！' }),
    firstName: z.string({ required_error: '名前は必須ですよ！' })
  })
);
const submit = (values) => {
  console.log(values)
  // { lastName: 'xxxx', firstName: 'yyyy' }
}
</script>

<template>
  <!-- HTMLフォームサブミットの場合 -->
  <!-- <Form :validationSchema="schema" action="/api/user" method="post"> -->
  <Form :validationSchema="schema" @submit="submit">
    <Field name="lastName" />
    <ErrorMessage name="lastName" />
    <Field name="firstName" />
    <ErrorMessage name="firstName" />
    <button>送信</button>
  </Form>
</template>
```

このコードでは、バリデーションが全てパスした状態で送信ボタンがクリックされると、`submit`関数が実行されます。
この時の引数としてフィールドの値が渡されます。関数内ではそれらが適切な値であることが保証された状態で後続処理を実行できます。

## Composition API

次に、もう1つの利用スタイルのComposition APIです。こちらはVeeValidateが提供するVueコンポーネントでなく、Composableを使用して実装します。
先ほどはHTMLレンダリングもありましたが、こちらのスタイルはUIには一切関知しませんので、より柔軟な実装ができます。

とはいえ、バリデーション実装方法やフォームサブミットの考え方はVueコンポーネントを使うやり方と同じです。

先ほどの最後の例をComposition APIを使ってエミューレートしてみます(Composition APIはUIがないので完全に一致はしていません)。

{% raw %}
```html
<script setup lang="ts">
  import { useForm } from 'vee-validate';
  import { z } from 'zod';
  import { toTypedSchema } from '@vee-validate/zod';

  const { defineInputBinds, errors, handleSubmit } = useForm({
    validationSchema: toTypedSchema(
      z.object({
        lastName: z.string({ required_error: '苗字は必須ですよ！' }),
        firstName: z.string({ required_error: '名前は必須ですよ！' })
      })
    )
  });

  const submit = handleSubmit((values) => {
    console.log(values);
    // { lastName: 'xxxx', firstName: 'yyyy' }
  })

  const lastName = defineInputBinds('lastName');
  const firstName = defineInputBinds('firstName');
</script>

<template>
  <form @submit="submit">
    <input v-bind="lastName" />
    <span>{{ errors.lastName }}</span>
    <input v-bind="firstName" />
    <span>{{ errors.firstName }}</span>
    <button>Submit</button>
  </form>
</template>
```
{% endraw %}

ポイントはuseForm Composableです。これがフォームレベルバリデーションの基本機能を提供するものです。

ここでZodのスキーマ定義を指定(`validationSchema`)しています。
Zodのスキーマ定義自体は、先ほどのVueコンポーネントに指定したものと全く同じです。

その後は、useFormが戻り値として提供する各種関数やデータを駆使してバリデーションと関連するUIを組み立てます。

- defineInputBinds関数: フォームにHTML入力要素(v-bind)を関連づける。対象がVueコンポーネント自体の場合はdefineComponentBinds関数を使用する。
- errors: エラー内容を格納するリアクティブデータ。エラー有無の判定やUIにエラーメッセージとして表示する。
- handleSubmit: フォームサブミットのヘルパー関数。イベント伝播抑止や実行タイミングを制御する。
 
これ以外にもuseForm Composableは多数の機能を提供します。
ここでは使っていませんがフィールドレベルバリデーションを提供するuseField Composableもあります。
Composableの詳細は公式ドキュメントを参照してください。

- [VeeValidate Doc - useForm](https://vee-validate.logaretm.com/v4/api/use-form/)
- [VeeValidate Doc - useField](https://vee-validate.logaretm.com/v4/api/use-field/)

## 最後に

今回はVue3に対応したVeeValidate v4をご紹介しました。
本記事の内容はごく概要レベルで、それ以外にも多数の機能が提供されています。

v3からの移行はかなりの痛みを伴うものになりそうですが、Vue2のEOL(2023/12)を考えると早めに移行を終わらせたいものですね。
