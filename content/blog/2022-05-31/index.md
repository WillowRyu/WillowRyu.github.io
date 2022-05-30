---
title: "Rxjs in React"
date: "2022-05-31"
description: "왜 사용하지 않는가"
---

예전에 운영하던 블로그에서 react 에서 rxjs 를 이용한  
간단한 state managenet 기법을 소개한 적 있다.

그 후 몇년이 지난 지금 조금 더 업데이트 된 좋은 패턴을  
소개하려 한다. 참고로 현재 프로젝트에서 사용하는 패턴이다.

rxjs 를 아예 모른다면 이해하기 힘들 수 있으니, 모른다면  
조금은 공부하고 봤음 한다.

## rxjs 로 react 에서 무엇을 할 수 있을까?

이에 대한 답은 거의 모든 것을 할 수 있다.  
state management 는 물론, dom event, 손위운 web socket 제어,  
동기 또는 비동기 이벤트 작성 등 프로젝트에서 작성하는 모든 이벤트를  
rxjs 를 이용해 쉽게 작성이 가능하다.

물론 rxjs 가 없어도 가능하겠지만, 중요한 부분은 **쉽게** 라는 점이다.  
이 글에선 이전과 마찬가지로 상태관리로 사용하는 방법에 중점을 둔다.

## 기본적인 state management 는 뭘 사용해야 할까?

redux, mobx, recoil, react context 등 기본적으로 많이 사용하는  
state management 라이브러리 들이 존재하지만, 본인은 현재 진행하는 프로젝트에선  
상태 관리 라이브러리는 아예 찾아보지도 않았다.  
그 많은 보일러플레이트 코드를 사용하기도 싫고, 사용 할 이유도 없었다.

rest 가 아닌 graphql 을 사용하면, 보통 client 에서 사용하는 라이브러리 에선  
query 로 받아오는 데이터는 캐싱을 활용하게 된다.  
이로 인해 server 와 연결된 데이터는 별도의 state management 를  
사용 할 이유가 없다.

남아있는 local storage 데이터들을 제외하고, global ui state 와  
메모리에 남겨야 할 state 들을 어떻게 관리 할 것인가? 간단하게 rxjs 로 해보자.

## 간단한 counter 예제

먼저 간단한 counter 예제를 생각해보자.  
increment, decrement 기능이 있고,  
view 에선 counter state 를 표시한다.

가장 기본적으로 코드를 보면

```javascript
export function Counter() {
  const [count, setCount] = useState(0)
  const handleCounter = {
    increment: () => setCount(count + 1),
    decrement: () => setCount(count - 1),
  }

  return (
    <div>
      <span>{count}</span>
      <button onClick={handleCounter.increment}>++++++</button>
      <button onClick={handleCounter.decrement}>------</button>
    </div>
  )
}
```

여기서 children 을 더 늘려보자.

```javascript
interface CounterButtonProps {
  onClick: () => void;
}

export function IncrementButton({ onClick }: CounterButtonProps) {
  return <button onClick={onClick}>++++</button>
}

export function DecrementButton({ onClick }: CounterButtonProps) {
  return <button onClick={onClick}>++++</button>
}

export function Counter() {
  const [count, setCount] = useState(0)
  const handleCounter = {
    increment: () => setCount(count + 1),
    decrement: () => setCount(count - 1),
  }

  return (
    <div>
      <span>{count}</span>
      <IncrementButton onClick={handleCounter.increment} />
      <DecrementButton onClick={handleCounter.decrement} />
    </div>
  )
}
```

여기까진 괜찮다.  
다만 이런 상황에서 children 이 더욱 늘어난다면?  
또는 해당 버튼이 하나씩만 존재하는게 아니고, 여러 부분에 있어야 한다면?  
다들 싫어하는 props drilling 현상이 나타나게 된다.

이를 방지하기 위한 방법은 여러가지가 있다.  
다만 rxjs 는 이를 더 쉽고 우아하게 해결한다.  
(위 코드는 단순히 예제로 만든 것이니, 저기서 굳이 쓸 필요 없다는 말은 하지말자.)

## event 를 만들자

위 예제에서 버튼이 onClick 을 props 받지 않고 실행할 수 있는 방법을 생각해보자.  
context ? context 는 말그대로 context 의 사용처를 어디서 사용할지 명확하게  
제한한다는 점에서 굉장히 좋지만 장황하다.  
그리고 만약 처음엔 괜찮지만, 나중에 counter state 를 프로젝트의 여러곳에서 사용한다면?

redux, recoil ? 등의 global state management 를 사용하는 방법도 있다.  
그걸 사용해도 된다. 다만 이후 설명 할 side effect 를 관리하는 방법에선  
굉장히 불편하다.

자 이제 rxjs 로 어떻게 해결하는지 살펴보자.

## counter service 의 작성

counter service 를 만들 것 이다.  
해당 서비스는 어디서든 접근 가능하고, 어디서든 조작 가능한 global service 이며,  
state 가 없고 단순히 버튼의 이벤트를 처리하는 service 다.

```javascript
const counter$ = new Subject<string>();

export const CounterService = {
  // observable
  onCounter$: () => counter$.asObservable(),

  // set
  increment: () => counter$.next('increment'),
  decrement: () => counter$.next('decrement'),
};

```

counter$ 는 subject 타입으로 우리는 counter$ 를 구독하여,  
이벤트를 수신 받을 것이다.  
(asObservable 은 subject 를 observable 로만 사용하게 된다.  
이는 counter\$ 에 접근하여 직접적으로 이벤트를 사용하지 않도록 하기위함이다.)

위 서비스를 적용해보자.

```javascript
export function IncrementButton() {
  return <button onClick={CounterService.increment}>++++</button>
}

export function DecrementButton() {
  return <button onClick={CounterService.decrement}>++++</button>
}

export function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const counter$ = CounterService.onCounter$().subscribe(event => {
      if (event === "increment") setCount(prev => prev + 1)
      if (event === "decrement") setCount(prev => prev - 1)
    })

    return () => counter$.unsubscribe()
  }, [])

  return (
    <div>
      <span>{count}</span>
      <IncrementButton />
      <DecrementButton />
    </div>
  )
}
```

useEffect 에서 우리는 이전에 만든 counterService 의 counter$ 를 구독하게 된다.  
버튼을 누르게 되면 increment 또는 decrement 이벤트를 counter$ 로 보내게 되고  
counter\$ 를 구독 하고 있는 counter 컴포넌트는 해당 이벤트를 받아  
counter state 를 변경 하게 된다.

이제 IncrementButton 과 DecrementButton 은 어디에서 사용해도 되는 독립적인  
컴포넌트가 되었다.

## Event 는 해결 되었다. 그럼 state 는?

button 의 독립은 이루어졌지만, state 의 독립은 아직이다.  
counter 를 한 곳이 아닌 여러곳에서 사용한다면?  
counter state 를 공통으로 사용하도록 해야 한다.  
이를 위해서 counter service 를 변경해보자.

```javascript
const counter$ = new BehaviorSubject() < number > 0

export const CounterService = {
  // observable
  onCounter$: () => counter$.asObservable(),

  // set
  increment: () => counter$.next(counter$.value + 1),
  decrement: () => counter$.next(counter$.value - 1),
}
```

subject 를 BehaviorSubject 로 변경 하였다.  
behavior subject 는 subject 와 다르게 값을 저장하는 기능을 가지고 있다.  
BehaviorSubject<number>(0); 여기서 0은 해당 state 의 초기 값이다.

counter\$ 에 새로운 구독이 일어나면 마지막으로 저장된 값을 방출한다.

이제 counter\$ 는 본인의 value를 가지고 있는
하나의 global state 가 되었다.

(이렇게 하나의 stream 에서 구독자에게 동일한 값을 방출 하는 것을 hot observable 이라고 한다.)

(반대로 cold observable 은 각 구독자에게 별도의 stream 을 할당한다.  
custom hook 과 같이 별도의 state 가 존재하는 것이다.)

이를 실제로 적용해 본다면

```javascript
export function Counter() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const counter$ = CounterService.onCounter$().subscribe(setCount)

    return () => counter$.unsubscribe()
  }, [])

  return (
    <div>
      <span>{count}</span>
      <IncrementButton />
      <DecrementButton />
    </div>
  )
}
```

버튼들은 변경 할 필요가 없다.  
이미 버튼은 단순히 클릭으로 인한 이벤트를 보낼 뿐, 그 뒤에 어떤일이 일어날지는  
알지 못하는 멍청한 컴포넌트가 되었다.

counter\$ 구독으로 얻는 값을 setCount 에 바로 적용하여,  
새롭게 렌더링을 하게 되었다.

이제 원하는 곳에서 onCounter\$ 를 구독하여 사용하면 global state 의  
역할을 하게 된다.

그러나, 아직 옵션이 남아있다.

## Custom hook 과 결합하자.

위 예제에서 거슬리는 부분이 2가지가 있다.  
useEffect 와 useState 다.  
counter 를 쓰는 모든곳에 해당 로직을 넣어주기에는 귀찮은 일이다.

우리가 counter 를 globalState 로 사용하려고 마음 먹은 이상  
counter 를 customHook 으로 만들어 재사용해야 한다.

그럼 만들어보자.

```javascript
export const useCountState = () => {
  const [count, setCount] = useState < number > 0
  useEffect(() => {
    const counter$ = CounterService.onCounter$().subscribe(setCount)

    return () => counter$.unsubscribe()
  }, [])

  return {
    count,
  }
}

export function Counter() {
  const { count } = useCountState()

  return (
    <div>
      <span>{count}</span>
      <IncrementButton />
      <DecrementButton />
    </div>
  )
}
```

오 아주 깔끔해 진것 같다.  
이제 count state 를 사용하고 싶은 곳에선 어디서든  
useCountState 를 사용하면 된다.

하지만 난 아직도 거슬린다.  
customHook 을 사용한 건 좋지만, 이왕 rxjs 를 사용한다면  
좀더 편한 customHook 이 있으면 좋겠다.

저기서 countState 를 customHook 으로 만들지 말고,  
stream 으로 받는 데이터를 그대로 state 로 쓸 수 있는  
hook 을 만들면 좋지 않을까?

그래서 만들었다.

## useObservableState Hook

useEffect 에 observable 과 관련된 로직을 넣게 되면,  
해당 컴포넌트가 리렌더링 될때, unsubscribe 와 subscribe 가 반복된다.  
그리고 지금은 괜찮지만, 만약 useEffect 로직이 길어지게 된다면?

그걸 방지 하기 위해 prop 으로 stream 을 받고 해당 stream 의 값을  
state 로 만들어주는 간단한 hook 을 만들어 보았다.

```javascript
import { useEffect, useState } from "react"
import { Observable, Subscription } from "rxjs"

interface ObservableState {
  <T, K = T>(
    props: ObservableStateProps<T, K> & { initialState?: undefined }
  ): T | K | undefined;
  <T, K = T>(props: ObservableStateProps<T, K>): T | K;
}

interface ObservableStateProps<T, K> {
  obs$: Observable<T>;
  input$?: (input$: Observable<T>) => Observable<K>;
  initialState?: T | (() => T);
}

export const useObservableState: ObservableState = <T, K>({
  obs$,
  input$,
  initialState,
}: ObservableStateProps<T, K>) => {
  const [state, setState] =
    (useState < T) |
    K |
    (undefined >
      (initialState instanceof Function ? initialState() : initialState))

  useEffect(() => {
    let observableState$: Subscription
    if (input$) {
      observableState$ = obs$.pipe(input$).subscribe(setState)
    } else {
      observableState$ = obs$.subscribe(setState)
    }
    return () => observableState$ && observableState$.unsubscribe()
  }, [obs$, input$])

  return state
}
```

실제로 프로젝트에서 사용하는 hook 이다.  
observable 과 pipe, iniitalState 를 받고, 해당 observable 로  
받은 데이터를 state 로 return 하며, 자동으로 unsubscribe 까지 해준다.

사실상 react 에서 rxjs 를 더욱 간편하게 사용하기 위해서  
subscribe 와 unsubscribe, 그리고 렌더링을 위한 state 작업을 모아둔  
custom hook 이다.

해당 hook 을 사용하여 다시 정리해보자.

```javascript
export function Counter() {
  const count = useObservableState({
    obs$: CounterService.onCounter$(),
  })

  return (
    <div>
      <span>{count}</span>
      <IncrementButton />
      <DecrementButton />
    </div>
  )
}
```

어마어마 하지 않은가?  
이제 global service 로 만드는 모든 state 는 useObservableState 로  
가져와서 간단하게 사용이 가능하다.

거기다 해당 service 에는 어떠한 이벤트도 추가 가능하다.  
예를 들어 일반적인 count 뿐만 아니라, count 에서 \* 2가 된 값도  
같이 보고 싶다면 input\$ 에 pipe 를 추가해도 되고,  
service 에 추가해도 된다.

```javascript
type inputType = { count: number, multi: number }

export const CounterService = {
  // observable
  onCounter$: () => counter$.asObservable(),
  onCounterWithMulti: () =>
    counter$.pipe(map(count => ({ count, multi: count * 2 }))),

  // set
  increment: () => counter$.next(counter$.value + 1),
  decrement: () => counter$.next(counter$.value - 1),
}

export function Counter() {
  const count =
    useObservableState <
    inputType >
    {
      obs$: CounterService.onCounterWithMulti$(),
    }

  return (
    <div>
      <span>{count?.count}</span>
      <span>{count?.multi}</span>
      <IncrementButton />
      <DecrementButton />
    </div>
  )
}
```

이제 하나의 state 로 count \* 2 한 값을 같이 볼 수 있다.  
이는 count state 가 변경 될때 마다 계속 유지되며,  
원본 state 는 변경하지 않고 손쉽게 값을 변경하고 표현 가능하다.

이런 패턴의 장점은 해당 로직을 어디서든 사용이 가능하다는 것이다.  
심지어 service 는 react 가 아닌 다른 프레임워크, 라이브러리 에서도  
재사용 가능하다. (rxjs 만 있다면.)

### 결론

간단하게 정말, 아주 간단하게 rxjs 를 react 에서 사용하는 패턴을 보았다.  
위에 적힌 예는 정말 빙산의 일각이며 실제로 더욱 많은 기능을 손 쉽게  
작성이 가능하다.  
특히 dom event 를 다룰때 rxjs 를 사용한다면 다신 기본 event 를  
사용하기 싫을 것이다.

**ReactiveX** 는 새로운 것도 아니고, 비인기 개념도 아니다.

[ReactiveX](https://reactivex.io/languages.html)

홈페이지를 보면 알겠지만, 수많은 주류 언어에서 사용되고 있으며  
observable stream 을 이해하기 시작하면, 어떠한 언어에서도 활용이  
가능하고, reactive programming (feat. functional programming)  
를 이해하는데 많은 도움이 될 것이다.

사실 더욱 많은 응용 예제를 올리고 싶지만  
글이 너무 길어지기 때문에 시간이 된다면 나중에 더 올리겠다.  
새로운 응용과 패턴의 사용은 이 글을 보는 사람들이 충분히 재밌고 쉽게  
사용할 수 있으리라 믿는다.

--
