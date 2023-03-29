---
title: URのシミュレータ環境をDockerで構築する
author: masayuki-kono
date: 2023-03-29
---

ロボットシステムの開発には欠かせないシミュレータですが、ここではURのシミュレータについてご紹介いたします。

安川電機の[MotoSim EG](https://www.e-mechatronics.com/product/robot/related/MotoSimEG/feature.html)やデンソーウェーブの[WINCAPSⅢ](https://www.denso-wave.com/ja/robot/product/software/wincaps3.html)など産業用ロボットのシミュレータは有償で提供されているものがほとんどですが、URでは以下の形式でシミュレータが公開されており無償で使用可能です。

- [Dockerイメージ](https://hub.docker.com/r/universalrobots/ursim_e-series)
- [VMWare PlayerやVirtualBoxのイメージ](https://www.universal-robots.com/download/software-e-series/simulator-non-linux/offline-simulator-e-series-ur-sim-for-non-linux-5130/)
- [インストーラ](https://www.universal-robots.com/download/software-e-series/simulator-linux/offline-simulator-e-series-ur-sim-for-linux-5130/)

インストーラの動作環境はLinux Mint 17.1(Ubuntu 14.04 based)と古いので開発環境と兼ねて使用するケースは少ないのではと思います[^1]。

[^1]: [
Installing URSIM on ubuntu 22.04](https://forum.universal-robots.com/t/installing-ursim-on-ubuntu-22-04/23166)のIssueの通りUbuntu 22.04へのインストールを試みた有志もいますが、仮想環境の使用が推奨されているようです。

弊社の開発では、動作が軽量であることと構成管理のし易さからDockerを使用することが多いため、ここではDockerを使用して環境構築からURを操作してみるところまでご紹介したいと思います。

## シミュレーション範囲

URのロボットシステムは主に以下の要素で構成されます。

- ロボットアーム
  - 6軸の垂直多関節ロボット
- ロボットコントローラ
  - ロボットアームを制御するコントローラ
  - URControlというアプリケーションが制御を行う
- ペンダント
  - ロボットの動作を教示するための端末
  - PolyScopeというアプリケーションがGUIを提供する

URControlは外部からロボットを制御するためのAPIを提供しており、このAPIを使用して外部PCで動作するユーザアプリケーションから制御することも可能です。

![](https://i.gyazo.com/1b6aeefd14d6dcdca5d6627d88a2ec7b.png)

シミュレータでは1つのDockerコンテナ内でURControlとPolyScopeが動作し、仮想的なロボットアームを制御する形になります。
URControlは基本的には実機環境と同じものですので[^2]、実機環境とシミュレータ環境の違いを意識することなく、ユーザアプリケーションでURControlとの通信部分の開発が可能です。

![](https://i.gyazo.com/89f46888b216aa046ef7e709e099aa01.png)

[^2]: 実機環境のOSはLinux Mint 17.1(Ubuntu 14.04 based)ですが、シミュレータ環境ではUbuntu 18.04がセットアップされていました([2023/3/29時点のlatest](https://hub.docker.com/layers/universalrobots/ursim_e-series/latest/images/sha256-abb92ff8ff7b2a8d4cfd10e9c8fa343fe5f6d1e373f00ff75300ba7ed50f8f6d?context=explore))。SWの外部仕様は同じでも下回りの実装は異なるかもしれません。

## シミュレータ環境を構築する

Dockerのセットアップ方法については割愛します。
今回はUbuntu 22.04にDocker-CEをセットアップしました。

以下のコマンドでイメージを pull します。

```shell
docker pull universalrobots/ursim_e-series
```

## シミュレータを起動する

以下のコマンドでコンテナを起動します。

```shell
docker run --rm -it -p 5900:5900 -p 6080:6080 universalrobots/ursim_e-series
```

コンテナ内でVNCサーバーが立ち上がりますので、ホスト側からVNCで接続するとPolyScopeのGUIが表示されます。
接続先は以下となります。

- WEBブラウザを使用する場合: `http://localhost:6080/vnc.html?host=localhost&port=6080`
- VNCクライアントを使用する場合: `localhost:5900`

起動直後はロボットの状態が Power off でロボットの移動は出来ません。
画面左下の Power off アイコンを押下してInitialize画面を表示して下さい。

![](https://i.gyazo.com/2bd3a46b171022cbae77e8290b4e4894.png)

ONボタンを押下するとロボットの状態が Idle に遷移し、ONボタンのラベルがSTARTに変化します。

![](https://i.gyazo.com/cb02d3488e3bef21f77edfc6ca074aa7.png)

STARTボタンを押下すると Normal に遷移し、ロボットの移動が可能となります。
実機環境では各ジョイントのサーボモータが励磁し、ブレーキが解除された状態となります。

![](https://i.gyazo.com/809840c95c9159b2dc585d9405bcb1b7.png)

## ロボットを移動する

### ロボットを手動で移動する

Moveタブを選択して手動でロボットを移動してみましょう。
右側の Joint Position の各矢印を押下するとジョイントが矢印の方向へ回転します。
左側の TCP Position の各矢印を押下するとロボットの先端が矢印の並進方向へ移動します。
左側の TCP Orientation の各矢印を押下するとロボットの先端位置は変化せず、矢印の回転軸周りに姿勢が変化します。
画面中央の Feature をViewから別の項目を選択することで移動時の座標系を指定することができます。
矢印を押下することでPolyScopeに表示されているロボットの3Dモデルが移動することを確認できると思います。

![](https://i.gyazo.com/27f56a91aec0c8147a6e515a4f51047b.png)

### ティーチプログラムを作成してロボットを移動する

Programタブを選択してロボットを動作させるプログラム（以下、ティーチプログラム）を作成してみましょう。
左側のメニューがプログラムに挿入可能な命令の一覧です。
Moveメニューを選択するとプログラムツリーに MoveJ という命令が挿入され、その下に Waypoint が同時に挿入されます。
各Waypointへロボットの目標位置を設定し、一連のロボットの動作フローを作成してゆきます。
他にもIOを制御する命令やIf...Else式などを使用可能です。
プログラムの作成方法の詳細は[ユーザマニュアル](https://s3-eu-west-1.amazonaws.com/ur-support-site/40989/UR5e_User_Manual_jp_Global.pdf)のプログラムタブの章を参照下さい。
下側の▶ボタンを押下するとプログラムが実行されます。

![](https://i.gyazo.com/803606c631de366450c3ca0ce5f3df09.png)

## ティーチプログラムをホストのファイルシステムに保存する

画面右上のSaveアイコンを押下するとティーチプログラムの保存が可能です。
プログラムはコンテナ内の`/ursim/programs`に保存されます[^3]。
ただし、これはコンテナのイメージを削除すると破棄されてしまいます。
コンテナ起動時に`volume(-v)`オプションを指定し、ホストの任意のディレクトリをコンテナ内の`/ursim/programs`にマウントしましょう。
以下のコマンド例ではホストの`${HOME}/programs`へティーチプログラムが保存されます。
保存したプログラムは次回のコンテナ起動時にもPolyScopeで読み込み可能です。

```shell
docker run --rm -it -p 5900:5900 -p 6080:6080 -v "${HOME}/programs:/ursim/programs" universalrobots/ursim_e-series
```

[^3]: 実機環境ではロボットコントローラ内の`/programs/`に保存されます。

## ティーチプログラムのファイル内容を確認してみる

Movej命令を2つ挿入したプログラムを move_to_2points という名前で保存するとホストの`${HOME}/programs`に以下のファイルが生成されました。
それぞれ内容を確認してみましょう。

```shell
$ ls move_to_2points*
move_to_2points.script  move_to_2points.txt  move_to_2points.urp
```

move_to_2points.txt はPolyScopeで表示されていたプログラムの内容と同じです。

```shell
$ cat move_to_2points.txt
 Program
   Variables Setup
   Robot Program
     MoveJ
       Waypoint_1
     MoveJ
       Waypoint_2
```

move_to_2points.script にはPythonライクなプログラムが記述されています。

```shell
$ cat move_to_2points.script
def move_to_2points():
  global _hidden_verificationVariable=0
  set_gravity([0.0, 0.0, 9.82])
  set_tcp(p[0.0,0.0,0.0,0.0,0.0,0.0])
  set_target_payload(0.000000, [0.000000, 0.000000, 0.000000], [0.000000, 0.000000, 0.000000, 0.000000, 0.000000, 0.000000])
  set_tool_communication(False, 115200, 0, 1, 1.5, 3.5)
  set_tool_output_mode(0)
  set_tool_digital_output_mode(0, 1)
  set_tool_digital_output_mode(1, 1)
  set_tool_voltage(0)
  set_safety_mode_transition_hardness(1)
  set_standard_analog_input_domain(0, 1)
  set_standard_analog_input_domain(1, 1)
  set_tool_analog_input_domain(0, 1)
  set_tool_analog_input_domain(1, 1)
  set_analog_outputdomain(0, 0)
  set_analog_outputdomain(1, 0)
  set_input_actions_to_default()
  step_count_b868544a_4032_4f5b_9ea3_d2b9e8af6e15 = 0.0
  thread Step_Counter_Thread_04f9659e_a720_49e6_96c2_0c8033cfe51b():
    while (True):
      step_count_b868544a_4032_4f5b_9ea3_d2b9e8af6e15 = step_count_b868544a_4032_4f5b_9ea3_d2b9e8af6e15 + 1.0
      sync()
    end
  end
  run Step_Counter_Thread_04f9659e_a720_49e6_96c2_0c8033cfe51b()
  global Waypoint_1_p=p[-.143968656714, -.435620060803, .202030025428, -.001221359682, 3.116276528482, .038891915637]
  global Waypoint_1_q=[-1.6006999999999998, -1.7271, -2.2029999999999994, -0.8079999999999998, 1.5951, -0.030999999999999694]
  global Waypoint_2_p=p[-.143968656711, -.435620060727, .316972358784, -.001221359682, 3.116276528482, .038891915637]
  global Waypoint_2_q=[-1.6006999999466975, -1.5433880589507778, -2.04162795671306, -1.1530839843348648, 1.5951000000013709, -0.030999999946700108]
  while (True):
    $ 2 "Robot Program"
    $ 3 "MoveJ"
    $ 4 "Waypoint_1" "breakAfter"
    movej(get_inverse_kin(Waypoint_1_p, qnear=Waypoint_1_q), a=1.3962634015954636, v=1.0471975511965976)
    $ 5 "MoveJ"
    $ 6 "Waypoint_2" "breakAfter"
    movej(get_inverse_kin(Waypoint_2_p, qnear=Waypoint_2_q), a=1.3962634015954636, v=1.0471975511965976)
  end
end
```

move_to_2points.urp はバイナリです。
urpがマスタで、txtとscriptはプログラムの編集時や実行時に生成される中間ファイルとなります。
そのためティーチプログラムの構成管理は urp のみで大丈夫です。

scriptは URScript と呼ばれるもので[言語仕様](https://s3-eu-west-1.amazonaws.com/ur-support-site/115824/scriptManual_SW5.11.pdf)が公開されています。
プログラムの実行時はこのURScriptがロボットコントローラでインタープリットされてロボットが動作します。

今回はPolyScopeでプログラムを作成することで中間ファイルとして URScript が生成され、これを実行しました。
URはEthernet経由で外部から URScript を受信して実行するAPIを公開しており、外部システムでMoveJ命令を含む URScript を順次生成してURへ送信し、ロボットを制御してゆくといった制御も可能です。
こちらについてはまた別の記事でご紹介したいと思います。

## ロボットの機種を指定する

URのロボットでは可搬重量に応じた以下の機種が用意されています。

|  機種名  | シリーズ | 可搬重量 | リーチ半径 | 繰り返し位置精度 |
| ---- | ---- | ---- | ---- | ---- |
|  UR3  |  CB-Series  |  3kg  | 500mm | ±0.1mm |
|  UR3e  |  e-Series  |  3kg  | 500mm | ±0.03mm |
|  UR5  |  CB-Series  |  5kg  | 850mm | ±0.1mm |
|  UR5e  |  e-Series  |  5kg  | 850mm | ±0.03mm |
|  UR10  |  CB-Series  |  12.5kg  | 1300mm | ±0.05mm |
|  UR10e  |  e-Series  |  12.5kg  | 1300mm | ±0.05mm |
|  UR16e  |  e-Series  |  16kg  | 900mm | ±0.05mm |
|  UR20  |  シリーズの記載無し  |  20kg  | 1750mm | ±0.05mm |

URのロボットのラインナップには CB-Series(旧機種) と e-Series(新機種)が存在します。
今回扱った[ursim_e-seriesのDockerイメージ](https://hub.docker.com/r/universalrobots/ursim_e-series)がサポートしている機種は e-Series のみです。
CB-Series については[ursim_cb3のDockerイメージ](https://hub.docker.com/r/universalrobots/ursim_cb3)をご利用下さい。

機種はコンテナ起動時に ROBOT_MODEL の環境変数へ指定します。
ROBOT_MODELへの指定値は機種名の末尾から`e`(シリーズ名)を取り除いた文字となります。
試しにUR16eを指定してみましょう。ROBOT_MODELへの指定値は UR16 となります。

```shell
docker run --rm -it -e ROBOT_MODEL=UR16 -p 5900:5900 -p 6080:6080 -v "${HOME}/programs:/ursim/programs" universalrobots/ursim_e-series
```

## まとめ

今回はURのシミュレータ環境をDockerで構築しました。
ロボットSIでは周辺機器を制御したりカメラでワークを検出してピッキングを行うなど実機環境でしか検証を行えないシーンも多々存在しますが、
URControlが公開しているAPI周りの実装などではシミュレータ環境でも十分対応出来るのではないでしょうか。

次回以降では、シミュレータ環境を活用してURControlが公開しているAPIについてご紹介できればと思います。
