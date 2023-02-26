import { useEffect, useState, useRef } from 'react';

export function useHeadsObserver() {
    const [activeId, setActiveId] = useState('');
    const observer = useRef();

    useEffect(() => {
        const handleObserver = (entries) => {
            if (!entries) {
                return;
            }

            // intersectしているヘッダーがあれば、目次内のそのヘッダーをハイライト対象とする。
            const entry = entries.find(entry => entry.isIntersecting);
            let activeId = entry?.target.id;

            // FIXME もっとスマートな方針ありそう
            // interctしているヘッダーがない場合、viewport上端との差（絶対値）が最も近いヘッダーをハイライト対象とする。
            // IntersectionObserverEntry.isIntersectingだけの判定だと、リロード時にintersectしているものが一つもない場合にハイライトされない。
            // ここでの判定基準は以下。
            // 1. viewport内にヘッダーが見えていれば、viewportの上端（＝画面の一番上側にあるもの）をハイライト対象とする。
            // 2. viewport内にいずれのヘッダーも見えていない場合、上方向にスクロールした場合に現れる（＝現時点では隠れている）最も近いヘッダーをハイライト対象とする。
            if (!activeId) {
                const activeEntry = [...entries].reduce((v1, v2) => {
                    return Math.abs(v1?.boundingClientRect.top) < Math.abs(v2?.boundingClientRect.top) ? v1 : v2;
                });
                activeId = activeEntry?.target.id;
            }

            setActiveId(activeId)
        };

        // viewportの上部5%の領域と監視対象のヘッダーがintersectしたらコールバック処理
        observer.current = new IntersectionObserver(handleObserver, { rootMargin: "0% 0% -95% 0%" });

        const elements = document.querySelectorAll('h1, h2');
        [...elements].slice(1).forEach((elem) => {
            observer.current.observe(elem);
        });

        return () => {
            observer.current?.disconnect();
        };
    }, []);

    return { activeId }
}