---
title: "FLIP 방식의 Animation 처리"
date: "2021-04-22"
description: "Animation 처리 시 60fps 효율적으로 유지"
---

오늘은 google 2014 Google Chrome Dev Summit 에서 소개된 FLIP 방식으로  
Animation 을 처리하는 기법을 살펴보자.

FLIP 방식은 Animation 처리 시 미리 최종값을 계산 하여
애니메이션 진행 중 무거운 계산을 하지 않도록 만들어, 빠르게 처리 하는 방식이며 element 의 크기, 위치, 불투명도 (즉 scale, transform, opacity) 를 이용한 애니메이션에서  
더욱 훌륭한 성능을 가져다준다.

글로만 보면 이해가 되지 않을 수 있다.  
실제로 어떤식으로 처리하는지 보자.

### FLIP 의 정의

FLIP 일련의 방식의 줄임말이다.

F: first  
L: last  
I: Invert  
P: Play

대상이 되는 element 의 초기 값을 계산하고,  
해당 element 의 최종 지점의 값을 계산한다.

그리고 현재 invert 를 적용하여 현재 element 의 위치로
invert 값을 부여한 뒤,  
최종 지점의 값으로 되돌린다.

### Code

간단하게 코드로 살펴보자.

```html
<div class="content-wrap">
  <div class="example-card"></div>
</div>
```

위와 같은 구조의 html 이 있다.

![sc1](./2021-04-22-1.png)

위 그림 같이 생긴 간단한 구조다.  
여기서 중앙에 있는 card 를 확장 시키는 애니메이션을 만들고자 한다.

![sc2](./2021-04-22-2.gif)

요런식으로 말이다.

그럼 FLIP 방식을 사용해서 만들어보자.

```javascript
.full-card {
  width: 100%;
  height: 100%;
  margin: 0;
  border-radius: 0;
}
```

```javascript
const card = document.querySelector(".example-card")

// F: 초기 위치 값을 계산한다.
const first = card.getBoundingClientRect()

// 대상 element 의 최종 상태로 적용시킨다.
card.classList.add("full-card")

// L: 마지막 위치 값을 계산한다.
const last = card.getBoundingClientRect()

// I: Invert 즉 초기 값에서 마지막 값을 뺀다.
const invert = {
  scaleX: first.width / last.width,
  scaleY: first.height / last.height,
}
```

코드를 간단히 정리하자면  
먼저 현재 card element 의 초기 위치 값을 가져온다.  
그리고 그 즉시 card element 를 우리가 원하는 최종 상태로 변환 시킨다.

이제 element 는 현재 화면에 꽉 차있는 위치가 되었다.  
여기서 현재 element 의 값을 가져온다.

이제 invert 값을 계산해보자.  
현재 애니메이션에서 우리가 원하는 건 크기의 변경이다.

dom 트리의 리플로우가 발생하지 않도록  
컴포지터 스레드를 활용한 애니메이션을 사용한다면  
여기선 크기와 관련된 scale 이 될 것 이다.

scale 값 계산을 위해서 초기 값에서 마지막 값을 나눠준다.  
이제 이 값을 가지고 animation 을 실행 해보자.

### Animation Play

```javascript
const animation = card.animate(
  [
    {
      transform: `scale(${invert.scaleX}, ${invert.scaleY})`,
    },
    {
      transform: "scale(1, 1)",
    },
  ],
  {
    duration: 300,
    easing: "ease-in-out",
  }
)
```

animate 함수를 보면 초기값이 계산된 invert 값이고,  
최종값은 우리가 원하는 기본상태이다.

이제 실행해보면 우리가 원하는 Animation 이 매끄럽게 작동한다.

### Why FLIP

그럼 왜 FLIP 방식을 사용하는가?  
일반적으로 브라우저의 레이아웃을 변경하는 트리거가 발생되었을때 (크기, 위치)등  
브라우저는 주위 다른요소의 레이아웃이 변경되었는지 재귀적으로 계속 계산하게 된다.

이때 그 계산 이 16.7ms 보다 오래 걸린다면 해당 프레임을 건너뛰기 때문에  
우리가 일반적으로 보는 끊김 현상이 나타난다.

이런 현상을 없애기 위해 FLIP 에서는 애니메이션이 실행되기전 미리 최종 위치를 계산하고 애니메이션만 실행하게 된다.  
이는 애니메이션 실행 도중 진행되는 브라우저의 부담을 확실히 줄이는 일이 된다.

F 단계에서 초기 값을 얻고, 즉시 최종위치로 전환할때 브라우저는 해당 element의 최종위치 와 전체 레이아웃 값을 다 계산이 완료 된 상태다.

여기서 우리는 이제 composite 단계에서만 애니메이션을 실행시켜  
사용자에게 보여주면 된다.

### 주의점?

위에서 서술 했듯이 브라우저가 최종값을 계산하는 그 시간이 100ms 를 넘기면 안된다.

RAIL 가이드에 따르면 사용자가 서비스와 상호작용 할때  
반응이 일어나기까지 100ms 의 시간이 주어진다.

이 시간을 이용하여 FLIP 은 최종 계산을 마치고 애니메이션을 실행하게 되는데  
반대로 초기 계산이 100ms 를 넘어가면 이는 끔찍한 애니메이션 경험이  
될 것이다.

상식적으로 아직 계산이 되지도 얺은 값을 가지고 애니메이션을 진행할 수는 없지 않은가?

그리고 해당 FLIP 을 진행 할때 오로지 composite 레이어 에서 작동하는 속성으로 진행 해야 한다.  
translate, opacity, scale, rotate 등이 그 예가 될 것이다.

composite 레이어에서 작동하는 다른 속성을 찾고 싶다면  
<a href="https://csstriggers.com/" target="_blank">https://csstriggers.com/</a> 여기서 검색해보면 된다.

그외 주의점 과 자세한 설명은  
Dev summit: <a href="https://youtu.be/RCFQu0hK6bU" target="_blank">Youtube</a>  
해당 영상을 참고하자.
