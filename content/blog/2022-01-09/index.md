---
title: "Frame Timing"
date: "2022-01-09"
description: "HTTP 203 Season 1 EP3"
---

HTTP 203 시리즈에 관한 견해와 내용을 정리 하려 한다.

### Frame Timing API

모바일 과 다양한 장치에서 사용자 경험을 최적화 하기 위해  
`Transition`, `Animation`, `Scrolling` 등 Browser 가 행하는  
UI 의 변화에 대해 60fps 를 유지 할 필요가 있다.

2022 년 현재는 각종 디바이스의 전체적인 고급화로 대부분의 디바이스에서  
60fps 를 유지하는게 어렵지 않다.  
(물론 충분히 정석적으로 코드를 사용했을때 얘기이다.)

Ep3 해당 시즌은 2014 년 기준.  
60fps 도달을 위해 사용자가 다양한 기기에서 테스트 하고 수정 할 수 있도록  
새로운 API 를 W3C 에 제안하기 시작했다.

Frame Timeing API 로 얻을 수 있는 점은 다음과 같다.

- Javascript 및 CSS Animation 의 fps 를 정보를 추적한다.
- 페이지 Scrolling 의 프레임을 추적한다.
- 장치가 현재 가지고 있는 부하에 따라 자동으로 frame 을 조정한다.
- 런타임 성능에 관한 테스팅

해당 API 의 사용법을 간단히 살펴보자. (renderer = main thread)

```javascript
var rendererEvents = window.performance.getEntriesByType("renderer")
```

결과는 다음과 같이 나온다.

```json
{
  sourceFrameNumber: 120,
  startTime: 1342.549374253
  cpuTime: 6.454313323
}
```

설명으론 각 `sourceFrameNumber` 는 해당 record 의 고유 넘버,  
`startTime` 은 `High Resolution Time` (= performance.now()) 을 나타내고  
`cpuTime` 은 말그대로 사용된 cpu 시간을 나타낸다.

해당 배열을 사용하여 각 frame 에 관하여 60fps 로 진행되고 있는지 체크가 가능하다.  
추가로 `cpuTime` 을 보고, 현재 cpu 사용량이 16ms 안에서 잘 사용되고 있는지  
체크도 가능하다.

`cpuTime`이 프레임당 16ms 와 가까워지면 garbage collection 작업에  
영향을 주기 시작하며 배터리 소모가 크게 늘어날 수 있다.

추가로 renderer 외, 브라우저에서 화면에 표시하는 단계인 `composite` 단계를  
체크하는 API 도 제안되었다.

```javascript
var compositeThreadEvents = window.performance.getEntriesByTyp("composite")
```

```json
{
  "sourceFrameNumber": 120,
  "startTime": 1352.343235321
}
```

이들의 frameNumber 를 연결하여 각종 합성 단계와 프레임과 관련된  
문제를 신속히 테스트 할 수 있다는 점이 해당 API의 이점이다.

결론적으로 해당 API는 위에서 말했듯이 결국 60fps 를 유지하는데 나타난 문제점들을  
신속하게 모니터링 하고 테스트 하기 위해 제안되었다.

제안 될 당시 개발자들의 피드백을 받았고 (2014년...)  
현재 찾아보니 해당 제안은 아직 채택되지 않았다.(?)

마지막으로 제안한 스펙에선  
설정이 본문과는 조금 다른버전이 있다.

```javascript
var observer = new PerformanceObserver(function (list) {
  var perfEntries = list.getEntries()
  for (var i = 0; i < perfEntries.length; i++) {
    console.log("Uh oh, slow frame: ", perfEntries[i])
  }
})
observer.observe({ entryTypes: ["frame"] })
```

이런식으로 entryType 을 지정 할수 있고  
cpuTime 은 빠지고 대신 `name`, `entryTime`, `startTime`, `duration` 이 포함된  
`PerformanceFrameTiming` 객체가 리턴되는 것으로 변경되었다.

해당 제안이 더 진행되지 않는 이유를 보자면

#### Problem 1

HTML spec 에서 해당 Time 을 가져오기 위한 적절한 hook 이 없다.

startTime 을 가져오기 위해서 `performance.now()` 메소드를 이용해서 가져와야 한다.

그리고 `PerformanceFrameTiming` 객체 값을 구하기 위해  
endTime 역시 `perfoemance.now()` 를 사용하게 되고, startTime - endTime 으로  
`duration` 을 구하게 된다.

해당 값 들을 구할때 사용자의 디바이스 성능, 전력 소비, 주사율 등  
프레임과 관련된 시간에 영향을 받는 정보들을 별도로 요구하고 있지 않다.  
테스트와 모니터링을 위한 정보라면, 개발자에게 잘못된 시간을 보고하지 않아야 하므로,  
프레임계산에 필요한 정보를 받아서 해당 사양에 맞는 임계값 또는 설정을 해야한다.

그 많은 디바이스와 사용자의 런타임 사양에 대하여, 별도의 설정을 하려면..어휴..  
포기한 이유가 보이기 시작한다.

#### Problem 2

두번째로는 정보가 많이 부족하다는 것 이다.  
현재로선 프레임과 관련된 정보만 줄 뿐, 느려진 원인에 대한 이유를 판별하기 위한  
메커니즘이 없다.  
별도로 event, raf, paint 작업에 관한 캡쳐링이 필요하다고 판단된다.

해당 2가지 문제가 나와있는데..  
문제 해결을 위한 작업이 만만치 않아 보인다.  
이로 인해 현재로선 아예 진행이 되지 않는다고 나와있는 걸로 보아 포기한 듯 싶다.

조금 과한 API 라는 지적도 있고, raf 로 충분하다는 지적도 있다.  
그리고 생각보다 많은 개발자들이 피드백을 안준 것(?) 같기도 하다.

어쨌든 첫번째는 이걸로 끝.  
사용 할 수 없는 API라..허무하기도 함.
