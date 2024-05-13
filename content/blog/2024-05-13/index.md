---
title: "JS Quiz"
date: "2024-05-14"
description: "쉬어가는 시간"
---

원래 주제는 다른 글 이지만, 본론을 올리기 전 간단하게 JS Quiz 를 보며  
refresh 를 해보자.

## Quiz.1

```javascript
console.log(018 - 015)
```

해당 console.log 의 output 을 어떤값일까?

1. <span style="color:#87CEEB">
   NaN
   </span>

2. <span style="color:#87CEEB">
   3
   </span>

3. <span style="color:#87CEEB">
   5
   </span>

4. <span style="color:#87CEEB">
   13
   </span>

.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.

#### Quiz 1 해설

다양한 생각이 있겠지만 JS 에서는 앞에 0이 붙으면 `Oct(8진수)` 로 계산이 된다.  
8진수는 각자리에서 8의 거듭제곱을 곱하고, 그 결과를 다 더해야 한다.

이제 각 값을 10진수로 변환하면?

- 018 은 8진수로 나타낼수 없다. 8진수는 0~7로만 이루어져 있다.  
  결국 018 은 10진수 18이 된다.
- 015 는 8진수로 변환시 각 자리에 8의 거듭제곱을 곱한 뒤 더하면 0 + 8 + 5 = 13 이 된다.

그럼 각 결과를 더하면 18 - 13, 즉 정답은 5가 된다.  
답은 `3번`이다.

> js 에서 `strict mode` 일때는 0을 붙였을시 표기 오류가 난다.  
>  그때는 `0o`를 붙여 8진수를 표현 할수 있다.

## Quiz. 2

```javascript
console.log(typeof typeof 1)
```

해당 console.log 의 output 을 어떤값일까?

1. <span style="color:#87CEEB">
   string
   </span>

2. <span style="color:#87CEEB">
   number
   </span>

3. <span style="color:#87CEEB">
   1
   </span>

4. <span style="color:#87CEEB">
   true
   </span>

.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.

#### Quiz 2 해설

이 어느정도 JS 를 해봤다면 아주 쉬울 것이다.  
JS 의 `typeof` 는 주어진 변수의 데이터 타입을 string 형식으로 반환하게 된다.

그럼 해당 문제를 하나씩 뜯어보면 `typeof 1` 은 `"number"` 가 나오게 되고  
`typeof "number"` 은 `"string"` 이 된다.

답은 `1번` 이다.

## Quiz. 3

```javascript
const numbers = [33, 2, 8]
numbers.sort()
console.log(numbers[1])
```

해당 console.log 의 output 을 어떤값일까?

1. <span style="color:#87CEEB">
   33
   </span>

2. <span style="color:#87CEEB">
   2
   </span>

3. <span style="color:#87CEEB">
   8
   </span>

4. <span style="color:#87CEEB">
   1
   </span>

.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.

#### Quiz 3 해설

이 문제를 못 맞춘다면....  
Js를 다뤄봤다면 아주 쉬운 문제이다.

정답은 `1번` 이다.  
해설은 따로 없다.

> Js 에서 sort 는 요소들을 문자열로 변경하여 정렬한다.

## Quiz. 4

```javascript
console.log(false == "0")
```

해당 console.log 의 output 을 어떤값일까?

1. <span style="color:#87CEEB">
   false
   </span>

2. <span style="color:#87CEEB">
   true
   </span>

.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.

#### Quiz 4 해설

여기는 약간 헷갈릴수 있다.  
`==` 와 `===` 의 차이를 생각하고 진행사항을 보자.

`==` 는 값을 비교할때 자동으로 두 값의 형변환을 진행하게 된다.  
Number(false) 는 0 으로 변환되어 `0 == "0"` 이 된다.  
여기서 `"0"` 은 다시 형변환 되어 `Number("0")` 즉 0 이 된다.

결론적으로 `0 == 0`이 되므로 결과값은 true 로 나오게 된다.  
답은 `2번` 이다.

> 만약 `===` 으로 비교한다면 값과 함께 유형검사도 하기 때문에 `false` 가 나온다.

## Quiz. 5

```javascript
console.log(0.1 + 0.2 == 0.3)
```

해당 console.log 의 output 을 어떤값일까?

1. <span style="color:#87CEEB">
   false
   </span>

2. <span style="color:#87CEEB">
   true
   </span>

.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.

#### Quiz 5 해설

이건 유명한 문제이며 원인은 부동소수점 숫자를 표현하는 데 `IEEE 754` 표준을 사용하기 때문이다.  
JS만 그렇지 않고 많은 언어들이 이를 따르고 있다.  
이 표준은 실수를 2진수로 정확히 표현하지 못하기 때문에 최대한 그에 근접한 값으로 변환하여 사용한다.

그래서 0.1 + 0.2 는 0.3 이 아니고 (ex 0.30000000000004) 약간의 차이가 생기게 된다.  
하여 정답은 `1번` 이다.

> JS 에서 이런 부분을 막기 위한 방법 중 한나로 `Number.EPSILON`을 활용하는 방법이 있다.  
>  `Number.EPSILON` 은 2의 -52승 의 값을 나타낸다.
> 해당 공식의 결과가 EPSILON 보다 작다면 이는 true 로 볼 수 있다.

## Quiz. 6

```javascript
let array = [1, 2, 3]
array[6] = 9
console.log(array[5])
```

해당 console.log 의 output 을 어떤값일까?

1. <span style="color:#87CEEB">
   1
   </span>

2. <span style="color:#87CEEB">
   2
   </span>

3. <span style="color:#87CEEB">
   9
   </span>

4. <span style="color:#87CEEB">
   undefined
   </span>

.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.

#### Quiz 6 해설

Js 에서 Array의 length 를 벗어나는 position 에 값을 할당할 경우  
Js 는 자동으로 빈부분을 채우게 된다.  
당연히 값이 없으니 undefined 로 채워지게 되고  
답은 `4번` 이 된다.

## Quiz. 7

```javascript
const isTrue = true == []
const isFalse = true == ![]

console.log(isTrue + isFalse)
```

해당 console.log 의 output 을 어떤값일까?

1. <span style="color:#87CEEB">
   1
   </span>

2. <span style="color:#87CEEB">
   0
   </span>

3. <span style="color:#87CEEB">
   "true"
   </span>

4. <span style="color:#87CEEB">
   true
   </span>

.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.

#### Quiz. 7 해설

`const isTrue` 를 살펴보면  
빈배열은 형변환이 되며 "[]" 이건 "" 이렇게 빈문자열로 변환된다.  
그리고 true 역시 형변환이 되며 true 는 숫자 1 이 된다.

이제 `1 == ""` 이런식으로 되었는데 빈문자열은 false, 즉 형변환을 하게 되면 숫자 0이 된다.  
결국 `1 == 0` 이 되므로 isTrue 의 값은 `false` 이다.

`const isFalse` 를 살펴보면  
![] 이부분은 Js 에서 기본적으로 빈배열은 truthy 값으로 평가 되기 때문에  
true 를 ! 로 논리 부정을 적용하면 false 가 된다.

false 는 형변환으로 숫자 0이 되고,  
true 는 위와 같이 숫자 1로 변환되기 때문에 결국 `1 == 0` 이 되고  
값은 `false`가 된다.

결국 isTrue 도 false 고 isFalse 도 false 가 되고,
isTrue + isFalse 는 false + false 가 되고 형변환이 이뤄지면  
`0 + 0` 즉 결과는 0이 나오게 된다.

정답은 `2번`

## Quiz. 8

```javascript
console.log(1 + "2" + "2")
```

해당 console.log 의 output 을 어떤값일까?

1. <span style="color:#87CEEB">
   122
   </span>

2. <span style="color:#87CEEB">
   32
   </span>

3. <span style="color:#87CEEB">
   NaN2
   </span>

4. <span style="color:#87CEEB">
   NaN
   </span>

.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.

#### Quiz. 8 해설

Js 에서 "+" operator 는 왼쪽에서 오른쪽으로 형변환을 시도하게 된다.  
1 + "2" 라는 건 "2" 의 타입이 string 이기 때문에 1은 "1" 로 변환되고  
결국 "1" + "2" 는 "12" 가 된다.

여기서 "12" + "2" 를 하게 되면 string 을 그대로 합치기 떄문에  
"122" 가 결과로 나오게 된다.

정답은 `1번` 이다.

## Quiz. 9

```javascript
console.log(String.raw`HelloTwitter\nworld`)
```

해당 console.log 의 output 을 어떤값일까?

1. <span style="color:#87CEEB">
   "HelloTwitter\nworld"
   </span>

2. <span style="color:#87CEEB; white-space:pre;">
   "HelloTwitter
    world"
   </span>

3. <span style="color:#87CEEB">
   "HelloTwitter world"
   </span>

4. <span style="color:#87CEEB">
   "Hello Twitter world"
   </span>

.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.

#### Quiz. 9 해설

String.raw 는 문자열 내부 이스케이프 시퀀스를 무시하고 원시 문자열 데이터를  
그대로 반환하게 된다.

여기서 '\n' 은 원래라면 new line 으로 해석되어야 하지만 String.raw 로 인해  
그대로 출력되어 정답은 HelloTwitter\nworld 그대로 값이 나오게 된다.

답은 `1번` 이다.

## Quiz. 10

```javascript
console.log("This is a string." instanceof String)
```

해당 console.log 의 output 을 어떤값일까?

1. <span style="color:#87CEEB">
   true
   </span>

2. <span style="color:#87CEEB">
   false
   </span>

.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.  
.

#### Quiz. 10 해설

instanceof 는 주어진 객체가 특정 클래스 또는 생성자의 인스턴스 인지 확인한다.  
해당 객체의 prototype 체인을 거슬러 올라가서 확인하기 떄문에  
"This is a string" 의 생성자를 생각해보자.

String 객체일가? 과연  
"This is a string" 의 타입을 생각해보자. 원시타입 string 이다.  
원시타입 string 은 String 객체에 의해 생성되지 않았기 때문에  
결과값은 false 가 나온다.

정답은 `2번` 이다.

> 여기서 true 가 나오려면 `new String("This is a string.")` 이 되어야 한다.

오늘 준비한건 여기까지, 크게 중요치 않지만  
그냥 갑자기 보여서 오랜만에 퀴즈를 풀어봤다.
