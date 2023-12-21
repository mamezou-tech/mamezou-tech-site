---
title: Vue3に対応したVuelidate2の変更点とはまった点
author: kohei-tsukano
date: 2023-12-21
tags: [社内プロジェクト, sss, vue, Vuelidate, advent2023]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
---
これは[豆蔵デベロッパーサイトアドベントカレンダー2023](/events/advent-calendar/2023/)第21日目の記事です。

# はじめに

夏のリレー連載に引き続きアドベントカレンダーにも参加させていただきました、本年度入社の塚野です。
入社後の研修を終え、8月から現在まで社内システム([Sales Support System](https://developer.mamezou-tech.com/in-house-project/sss/intro/) 以下SSS)の開発に携わっています。
SSSではjavascriptフレームワークの一つであるVue.jsを用いて画面周りの構築を行っていますが、現行のバージョンであるVue2系が本年末にEOLを迎えることから、急ピッチで最新のVue3系への移行を行っています。
その際、コンポーネントフレームワークであるVuetifyとバリデーションライブラリとして使用しているVuelidateのアップデートも同時に行いました。これらライブラリについても、破壊的変更から精神攻撃的な細かい変更まで盛り沢山でした。とりわけVuelidateに関してはVue3対応版の記事が少なく、公式ドキュメントもわかりづらかったため、改めて変更点とつまづいたポイントについてまとめたいと思います。本記事がVue3移行に苦しめられている誰かの助けになれば幸いです。

# Vuelidate2へのアップグレードでつまづいた点

VueのリアルタイムバリデーションライブラリでVeeValidateに次ぎ人気なのがVuelidateです。
Vuelidateのナンバリングですが、Vue2版はVuelidate 0.xなのに対しVue3対応版はVuelidate 2.xとなっています(以下Vue3対応版をVuelidate2とします)。
Vuelidateは基本的にテンプレート側で必要な記述はなく、すべてスクリプト側での実装で完結します。

## バリデーションオブジェクトの変更

SSSではTypeScript + Composition APIのsetupシンタックスを用いています。
[公式のサンプル](https://vuelidate-next.netlify.app/#alternative-syntax-composition-api)を元にscript setupで書き換えた、基本的なVuelidateの実装はこのようになります。

```typescript
// script setup
import { reactive } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, email } from '@vuelidate/validators'

const state = reactive({
  firstName: '',
  lastName: '',
  contact: {
      email: ''
  }
})

const rules = {
  firstName: { required },
  lastName: { required },
  contact: {
      email: { required, email }
  }
}

const v$ = useVuelidate(rules, state)
```

Vulidate 0.xからの変更点としてはuseVuelidate()メソッドを使用する必要があることがあげられます。
引数にそれぞれバリデーションルール、検証を行うデータを取り、バリデーションオブジェクトである`v$`(Vuelidate 0.x系では`$v`でした[^1])を返します。
バリデーションルールは検証するデータと対応しており、それぞれに必須ならrequired、メール形式ならemailといったビルトインのメソッドを用いてバリデーションルールを簡単に定義することができます。検証対象のデータにはリアクティブオブジェクトかrefのコレクションを取ることができます。
ここで、バリデーションルールは上記例ではオブジェクトで記述していますが、これはVuelidate 0.x系との後方互換性を保つためであり、バリデーションルールをリアクティブに使いたい場合、ルールは下記のようにcomputedにする必要があるようです。
こちらも[公式ドキュメント(Computed function with Composition API)](https://vuelidate-next.netlify.app/api/rules.html#computed-function-with-composition-api)からの引用ですが、今回stateはrefで定義してみました[^2]。

[^1]:Vuelidate2からバリデーションオブジェクトに任意の変数名を付けられるようになりました。ただし`$`で始まる変数名は使用できなくなったようです。公式では`v$`もしくは`v`を使用しています。
[^2]:refを使うかreactiveを使うか問題がありますが、本プロジェクトでは基本的にrefで統一しています。

```typescript
import { ref } from 'vue'

const someBooolean = ref<boolean>(false)
const someValidator = () => {
  // 何かしらのバリデーション
}

// state
const password = ref<string>('')
const confirmPassword = ref<string>('')

// rules  computedとして定義
const rules = computed(() => {
  if (someBoolean.value) {
    return {
      password: { someValidator }
    }
  }
  return {
    password: { required },
    confirmPassword: { sameAs: sameAs(state.password) }
  }
})
const v$ = useVuelidate(rules, {password, confirmPassword})
```

ここで、バリデーションオブジェクトである`v$`はcomputedであることに注意が必要です。よってスクリプト側で参照する場合は`.value`が必要になります。
加えて、バリデーションオブジェクトの構造にも変更があり、例えば名前の必須チェックの結果を参照する記述は以下のように変更になっています。

```javascript
//Vuelidate 0.x
let invalid = !this.$v.name.required

//Vuelidate2
let invalid = v$.value.name.required.$invalid
```

今回の変更でinvalidの値を取得できるようになっていますが、この仕様変更のせいで真偽値逆になってた…なんてこともありました。
オブジェクトのプロパティに関しては[公式ドキュメント(Validation State Values)](https://vuelidate-next.netlify.app/api/state.html#validation-state-values)を参照してください。

## カスタムバリデーションの実装とhelpersメソッド

バリデーションルールはビルトインだけではなく自作したものを使用することもできます。

```typescript
import { helpers } from '@vuelidate/validators'

const confirmedName = (value: string | null) => {
  // 命名規則に沿った名前かチェックする処理
}

const baseValidations = computed(() => {
  const localRules = {
    name: {
      required,
      confirmedName // #1
    },
    number: {
      required,
      isUniqueNumber: helpers.withAsync(async (value: string | null) => { // #2
        if (!value || value === '') {
          return true
        }
        if (!store.changedNumber) {
          return true
        }
        return !(await store.existsNumber(value))
      }),
    }
  }
  return localRules
})

```

上記のコード例内の`#1`では、boolean値を戻す関数を定義し、その関数をそのままビルトインのバリデーターと同様の記述方法でカスタムバリデーターとして使用可能です。
関数の戻り値がfalseのとき、カスタムバリデーターはinvalidとなります。
`#2`ではバリデーションの処理を直接ルール内に記述してカスタムバリデーターを定義しています。
`バリデーション名: 処理`で定義可能です。
ここで、カスタムバリデーターの処理にasync/awaitを用いて非同期処理を記述できますが、Vuelidate2からの変更点として非同期処理の記述にはwithAsyncヘルパーの使用が必要となりました。
例のようにwithAsync()の引数に処理を渡してあげればよいです。
[公式ドキュメント(Custom Validators)](https://vuelidate-next.netlify.app/custom_validators.html#custom-validators)では、さらにカスタムバリデーターに引数を渡す方法や、バリデーター内でほかのバリデート対象にアクセスする際の記述方法などが解説されています。また、正規表現を用いたバリデーションを実装する際に便利なregex helperはVuelidate 0.x系からメソッドシグニチャに変更があります。興味のある方はそちらもご覧ください。

## 親コンポーネントへのバリデーションの伝播

こちらも大きな変更点かと思います。Vuelidate2からはネストしたコンポーネント間において、子コンポーネントのinvalidやエラー文を含むバリデーションの情報(具体的には`$errors`と`$silentErrors`オブジェクト)が親へ自動的に伝播するようになりました。つまり子コンポーネントのうち一つでもinvalidなら親コンポーネントの`v$.$invalid`の値がtrueとなります。また、ネストの深さは関係なく親コンポーネントはすべての子孫コンポーネントのinvalidの値を集めるようです。
裏を返せばいちいちvalidの値をwatchしてemitせずに済むようになりました。とはいってもすべてのコンポーネントでこれでは困ってしまいますので、伝播させないようにするプロパティが増えました。

```typescript
const v$ = useVuelidate(validations, state, { $stopPropagation: true })
```

このようにstopPropagationプロパティを渡してあげることで親コンポーネントに勝手にemitしないように設定できます。
これに対し、子コンポーネントのバリデーションを集める親コンポーネントでは引数なしでuseVuelidateを呼んであげればよいです。

```typescript
const v$ = useVuelidate()
```

## $eachの廃止

テンプレート内でv-forディレクティブを用いてリストをレンダリングした際に、リスト内のそれぞれの項目について検証を行いたいときには`$each`ヘルパーを使用していました。

```javascript
validations() {
  return {
    items: {
      $each: {
        name: {
          required
        }
      }
    }
  };
}
```

上記はVuelidate 0.x系でのバリデーションルールの実装になりますが、items内のすべてのname, numberに対するバリデーションを定義するにはルール内で`$each`を用いて簡単に記述することができました。
Vuelidate2では`$each`が廃止され、前述した、ネストしたコンポーネント間におけるinvalidの伝播を利用した実装に移行することを推奨しています。
公式ドキュメントでも破壊的変更の一つとして挙げられており、コンポーネントの実装変えなくちゃじゃん…というユーザーのためにforEachヘルパーとValidateEachコンポーネントが用意されています。
forEachヘルパーの使いかたは簡単で、
`$each: { name: { required } }`
と記述していたものを
`$each: helpers.forEach({ name: { required } })`
に変更するだけです。バリデーションオブジェクトからエラーメッセージを参照する際の書き方については[公式ドキュメント(Validating Collections)](https://vuelidate-next.netlify.app/advanced_usage.html#validating-collections)を参考にしてください。
ただし、このヘルパーメソッドはコレクションが変更されるたびにコレクション内のすべてのバリデーターを実行してしまいます。パフォーマンスを考えると推奨のネストしたコンポーネントでの実装に切り替えたほうがよいでしょう。
そこで、簡単にネストしたコンポーネント構造を実装できるValidateEachコンポーネントが`@vuelidate/components`から提供されています。
以下は`<table>`をラップしたVuelidate2のディレクティブであるv-tableを使用した実装例になります。

```html
<template>
  <v-table>
    <thead>
      <!-- header -->
    </thead>
    <tbody>
      <ValidateEach v-for="(item, i) in items" :key="i" :rules="validations" :state="item">
        <template #default="{ v }">
          <tr>
            <td>
              <v-text-field
                :model-value="v.name.$model"
                :error-messages="v.name.$errors.map((error) => error.$message)"
              ></v-text-field>
            </td>
          </tr>
        </template>
      </ValidateEach>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useVuelidate } from '@vuelidate/core'
  import { ValidateEach } from '@vuelidate/components'
  import { helpers, required } from '@vuelidate/validators'

  const items = ref([{ name: 'mamezou' }, { name: 'mameka' }])
  const validations = {
    name: {
      required: helpers.withMessage('名前は必須入力です', required),
    }
  }

  const v$ = useVuelidate()
</script>
```

v-forでリストをレンダリングしたい箇所をそのままValidateEachのdefaultスロットに渡し、プロパティとしてバリデーションルールと検証対象のオブジェクトを渡してあげます。
td内のv-text-fieldにバインドする値はValidateEachのバリデーションオブジェクトであるvから取得します。また、エラーメッセージもvから取得したいため、カスタムエラーメッセージをルール内で定義できるwithMessageヘルパーを使用しています。

## 初期化時の挙動と`$lazy`

Vuelidate2への変更でかなりはまったのが初期化時の挙動の変更についてです。こちら公式ドキュメントには詳しい記述は見つけられなかったのですが、`@vuelidate/core`内のreadmeに以下のような記述を見つけました。
>Validation in Vuelidate 2 is by default on, meaning validators are called on initialisation, but an error is considered active, only after a field is dirty, so after `$touch()` is called or by using `$model`.

初期化時にバリデーターが呼ばれるとありますが、具体的にはOptions APIではライフサイクルフックでいうところのonBeforeMount、Composiotion APIではcreatedのタイミングのようです[^3]。このタイミングでバリデーションが1度実行されることとなります。
実際、バリデーションルール内にloggerを記述するとコンポーネントのcreateのタイミングでデバッグ文がコンソールに出力され、ルール内のスクリプトが実行されることがわかりました。
ただし記述にあるようにdirty状態になった後でエラーが評価されるようで、基本的な動きに影響はありません。
困った挙動になるのが以下のようなカスタムバリデーションを実装したときです。

[^3]:[vuelidate/packages/vuelidate/src/index.js](https://github.com/vuelidate/vuelidate/blob/next/packages/vuelidate/src/index.js#L71)を参照。Composition APIではimmediateオプションがついたwatcherで初期化がトリガーされます。Vue2版ではimmediate付きwatcherの実行タイミングはbeforeCreateとcreatedの間とする[記事](https://qiita.com/sin_tanaka/items/64b4a48bcb6dac924380)がありますが、Vue3のcomposition APIでは統合されている([参照](https://ja.vuejs.org/api/composition-api-lifecycle.html#composition-api-lifecycle-hooks))ためcreatedのタイミングとしました。

```typescript
const id = ref<string | null>(null)

const baseValidations = computed(() => {
  const localRules = {
    id: {
      required,
      integer,
      isUniqueId: (value: string | null) => {
        if (!value || value === '' || v$.value.id.integer.$invalid) { //　※
          return true
        }
        if (isMyOwnId()) {
          return true
        }
        return !(existsId(value))
      },
    },
  }
  return localRules
})

const v$ = useVuelidate(
  baseValidations, { id }
)
```

重要なのは※の記述で、ルール内でバリデーションオブジェクトを使用しています。このオブジェクト`v$`はuseVuelidateによって生成されるため、コンポーネントのcreateのタイミングで※の行が実行されると、定義されていないオブジェクトを参照するためかこの時点でルール定義のブロックから脱出してしまいます。さらに、読み込み中だったルール(今回だとisUniqueId)に関しては強制的にinvalidとなり、この行以降のルールに関しては初期化が行われませんでした。ただし、dirtyになれば再度エラーの評価は行われます。
これを回避するためには、

- そもそもルール内で`v$`を参照しない

か、[公式ドキュメント(Accessing Component Instance From Validator)](https://vuelidate-next.netlify.app/custom_validators.html#accessing-component-instance-from-validator)にあるように

- `await nextTick()`を利用する
- Vuelidate2で追加された`$lazy`プロパティを利用する

という選択肢があります。
1つ目は言わずもがなですが、requiredだけはhelpersに用意されたreq()メソッドを用いて代用ができます。`helpers.req(id)`はidのrequiredがvalidかどうかを返します。つまり`!v$.value.id.required.$invalid`と同義です。

```typescript
import { helpers } from '@vuelidate/validators'

const id = ref<string>('')
const name = ref<string>('')

const rules = {
    id: {
      required
    },
    name: {
        required: requiredIf(helpers.req(id)),
        $lazy: false
    }
}

const v$ = useVuelidate(rules, { id, name }, { $lazy: true })
```

useVuelidateに渡している`$lazy`プロパティですが、これをつけるとdirty状態になった後にバリデーションが初めて評価されるようになります。つまりcreate時のバリデーションが走らなくなるため、ルール内で`v$`を参照しても強制的にinvalidにされることはありません。useVuelidateの引数に渡すとルール全体に適用されますが、個別のルールに対して設定することも可能です。ちなみにルール内で設定する方が優先されるようなので、上記の例のようにすればデフォルトをtrueにも設定できます。
注意しなければいけないのは、`$lazy`を付けたルールはdirtyになってから初めて評価されるため、コンポーネント読み込み時の`$invalid`の値はfalseとなるということです。
つまり、上記の例でいうところのidはコンポーネントの読み込み時には空文字にも関わらず、requiredがinvalidにならない可能性があります。
よって結論として、ルール内で`v$`を使用したいだけであれば`await nextTick()`を用いるのが安全な気がします。

## `$autoDirty`プロパティ

これまでは`@blur`や`$model`のwatcherでバリデーションオブジェクトの`$touch()`をトリガーすることでdirty状態の管理を行ってきましたが、Vulidate2からは新しく`$autoDirty`プロパティをつけることでdirty状態を自動で管理できるようになりました。
dirtyとdirtyの管理方法については[こちらのサイト](https://zenn.dev/naga3/articles/a9a9d2002422b5)でまとめられています。
`$lazy`と同様に`$autoDirty: true`をバリデーションルールもしくはuseVuelidateの引数に渡すconfigオブジェクトのプロパティに追加することで設定可能です。
これは`$model`のwatcherを内部的に作ってくれるようで、検証対象のデータの値が変更されたときにdirtyとなります。そのため、フォーカスアウトでdirtyにしたい場合は以前同様`@blur`で`$touch()`を呼び出す必要があります。

# 終わりに

今回は本プロジェクトではまった点をもとに、Vuelidate2からの変更点について一部紹介しました。
冒頭でも述べたとおり、VuelidateだけではなくUIライブラリーであるVuetifyについても移行作業でつまづいた点が多々ありました。こちらのライブラリの移行についても機会があればまとめたいと思っています。
