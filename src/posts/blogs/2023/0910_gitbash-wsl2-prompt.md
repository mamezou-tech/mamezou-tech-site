---
title: Git BashとWSL2のプロンプトを揃えて気持ちよくする
author: toshio-ogiwara
date: 2023-09-10
tags: [terminal, wsl, ubuntu, tips]
---
[Git Bash](/blogs/2023/09/08/windows-terminal-with-git-bash/)と[WSL2+Ubuntu](/blogs/2023/09/09/docker_ubuntu_on_wsl2/)の記事が続いたので筆者もその流れに乗ってGit BashとWSL2のTipsネタを紹介します。

# たかがプロンプト、されどプロンプト
筆者も日頃Windows TerminalのGit BashとWSL2上のUbuntuを良く使っています。WSLに入るときは使い慣れたGit Bashから`wsl`コマンドを叩いてWSLに入るのですが、WSLに入ると当たり前ですがプロンプトはUbuntuの環境のものに替わります。

![cap01](/img/blogs/2023/0910_prompt-oldstyle.drawio.svg)
※:tsukumoはホスト名ですが、なぜその名前かは秘密です

このデフォルトのプロンプトですが、Git BashとUbuntuともにカレントディレクをフルパスで出力するため、深いディレクトリに移動すると使いづらくて仕方ありません。また、Git Bashは改行して入力待ちしますが、これも縦長で見づらいため好みではありません。

このため筆者はGit BashとUbuntuのプロンプトのどちらとも自分好みの同じスタイルに変更して使っていました。

これはこれでGit BashからWSLに移動しても、そしてWSLからGit Bashに戻っても「ログインするマシンごとにプロンプトのスタイルが変わってなにか落ち着かない」といったよくある気持ち悪さもなくなり、気持ちよく使えていたのですが、1つだけ困ることがありました。それはプロンプトを全く同じにするとGit BashとWSLのどっちにいるのか分からなくなることです。

なので、筆者は次のようにプロンプトの`@host`の部分を固定の`win`と`wsl`の文字列にし文字色を変えてパッと見でどちらのプロンプトにいるか分かるようにしています。

![cap02](/img/blogs/2023/0910_prompt-newstyle.drawio.svg)

コレ、自分でいうのもなんですが、とても使いやすくて気に入っています。ということで、今回はこのプロンプトの変更方法を紹介します。

# Git Bashのプロンプトの変更
まずGit Bashのデフォルトのプロンプト定義は`C:\Program Files\Git\etc\profile.d\git-prompt.sh`[^1]にあります。この中身を見てみると次のようになっています。
[^1]:Git Bashのインストールディレクトリを変更している場合、`C:\Program Files\Git`は読み替えてください

- デフォルトの`git-prompt.sh`
```shell
if test -f /etc/profile.d/git-sdk.sh
then
	TITLEPREFIX=SDK-${MSYSTEM#MINGW}
else
	TITLEPREFIX=$MSYSTEM
fi

if test -f ~/.config/git/git-prompt.sh
then
	. ~/.config/git/git-prompt.sh
else
	PS1='\[\033]0;$TITLEPREFIX:$PWD\007\]' # set window title
	PS1="$PS1"'\n'                 # new line
	PS1="$PS1"'\[\033[32m\]'       # change to green
	PS1="$PS1"'\u@\h '             # user@host<space>
	PS1="$PS1"'\[\033[35m\]'       # change to purple
	PS1="$PS1"'$MSYSTEM '          # show MSYSTEM
	PS1="$PS1"'\[\033[33m\]'       # change to brownish yellow
	PS1="$PS1"'\w'                 # current working directory
  ...
fi
```

8行目のif文からWindowsユーザのホームディレクトリに`.config/git/git-prompt.sh`ファイルを作っておくとそれが優先されることが分かります。（それぞれのメタキャラクタの意味はコメントと雰囲気から察してください）

ということで、Windowsユーザのホームディレクトリに`.config/git/git-prompt.sh`のファイルを作り、そこに好みのプロンプトスタイルを定義します。先ほどの見てもらった筆者が使っているプロンプトの定義は次のとおりです。

- ホームディレクトリの`.config/git/git-prompt.sh`
```shell
PS1='\[\033]0;$TITLEPREFIX:$PWD\007\]' # set window title
#PS1="$PS1"'\n'                # new line
PS1="$PS1"'\[\033[32m\]'       # change to green
PS1="$PS1"'\u@win'             # user@'win'<space>
PS1="$PS1"'\[\033[0m\]'        # change to white
PS1="$PS1"':'                  # ':'
PS1="$PS1"'\[\033[33m\]'       # change to brownish yellow
PS1="$PS1"'\W'                 # current working directory
if test -z "$WINELOADERNOEXEC"
then
    GIT_EXEC_PATH="$(git --exec-path 2>/dev/null)"
    COMPLETION_PATH="${GIT_EXEC_PATH%/libexec/git-core}"
    COMPLETION_PATH="${COMPLETION_PATH%/lib/git-core}"
    COMPLETION_PATH="$COMPLETION_PATH/share/git/completion"
    if test -f "$COMPLETION_PATH/git-prompt.sh"
    then
        . "$COMPLETION_PATH/git-completion.bash"
        . "$COMPLETION_PATH/git-prompt.sh"
        PS1="$PS1"'\[\033[36m\]'  # change color to cyan
        PS1="$PS1"'`__git_ps1`'   # bash function
    fi
fi
PS1="$PS1"'\[\033[0m\]'        # change color
#PS1="$PS1"'\n'                 # new line
PS1="$PS1"'$ '                 # prompt: always $
```
※:変更しているのは前半の8行目までと下から2行目の改行をコメントアウト部分で、それ以外はデフォルトの`git-prompt.sh`の内容と同じです

新しいターミナルを立ち上げて次のようになっていたらGit Bash側の変更は完了です。
![cap03](/img/blogs/2023/0910_prompt-newgitbash.drawio.svg)


# Ubuntuのプロンプトの変更
次にWSL2上のUbuntuです。Ubuntuのプロンプトは一般的なBash環境と同様でUbuntu側のユーザのホームディレクトの`~/bashrc`(Windows側からは` \\wsl.localhost\Ubuntu\home\[ユーザーID]\bashrc`)に定義されています。

筆者は60行目辺りにあるプロンプト定義をGit Bash側と同じようになるように次のように変更しています。

```shell
if [ "$color_prompt" = yes ]; then
    #PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
    PS1='\[\033[32m\]'             # change to green
    PS1="$PS1"'\u@'                # user@
    PS1="$PS1"'\[\033[36m\]'       # change to blue
    PS1="$PS1"'wsl'                # 'wsl'
    PS1="$PS1"'\[\033[0m\]'        # change to white
    PS1="$PS1"':'                  # ':'
    PS1="$PS1"'\[\033[33m\]'       # change to brownish yellow
    PS1="$PS1"'\W'                 # current working directory
    PS1="$PS1"'\[\033[0m\]'        # change color
    PS1="$PS1"'$ '                 # prompt: always $
else
    PS1='${debian_chroot:+($debian_chroot)}\u@\h:\w\$ '
fi
```

<br/>

Git BashからWSL2に移動してプロントが次のように変わるのが確認できたら、Ubuntu側の変更も完了です。
![cap04](/img/blogs/2023/0910_prompt-newubuntu.drawio.svg)

# 最後に
最初の見出しにある「たかがプロンプト、されどプロンプト」ではないですが、シェル上で多くの時間を過ごす場合、プロンプトの見やすさは無視できないものがあります。今回は筆者好みのプロンプトスタイルを紹介しましたが、これを参考に自分なりの気持ちがよいスタイルを模索してみてはどうでしょうか。
