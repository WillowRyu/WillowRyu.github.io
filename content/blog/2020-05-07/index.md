---
title: 'React Native Android 개발 후기'
date: '2020-05-07'
description: 'React Native를 사용하며 겪었던 고충, 그리고 버그들과 해결했던 방법에 대한 공유'
---

React 가 jQuery, Angular js 를 누르고 현재 가장 널리 쓰이는 Front-end 
프레임워크 가 된지 몇년이 흘렀다. (네 정확히는 UI 라이브러리 입니다.)

Google 을 좋아해 Angular 를 주로 해왔지만, 대부분 React 를 사용하니 어쩌겠는가  
먹고 살기위해 일단 대세에 따라 React 로 제품을 만들고 있다.

그 중 이번에 React Native (줄여서 RN) 를 활용하여 태블릿 앱을 만들게 되었다.  
Cross platform 을 좋아했기 때문에 이전에 Ionic, Native Script 그리고  
현재 핫 한 Flutter 를 사용 하여 만들었지만, 유독 RN 은 건들여 본 적이 없다.  
(그 당시 회사에서 RN 을 활용한 프로젝트를 하고 있었지만 참여하지 않았다.)

어쨋든 결국 개발 완료 했으니 만들며 느낀 점 과 수많은(?) 버그에 대처한 방법을  
공유 하려 한다.  
이 글이 누군가에게 조금이라도 도움이 된다면 좋겠다.

개발 당시 RN 의 버전은 0.61+, 즉 Fast Refresh 가 적용된 버전.

## Expo?

처음 RN 설치 시 Expo 를 활용한 방법과 순수하게 RN 을 이용하여 설치 하는 방법이  
있는데 Expo가 뭔가 하고 찾아봤더니, RN 개발을 좀 더 쉽게 해주고, 내가 만든 앱을  
웹으로 볼수 있게 해주고, 어쩌고 저쩌고...

__결국 나중에 Eject 를 해야 하는 상황이 올 수 있다?.__

그래서 Expo 는 탈락 시키고 순수 RN 을 설치하게 되었다.

다들 알겠지만 타 패키지 의존성은 최대한 줄이는 것 이 좋다.  
특히 React 같이 커뮤니티에서 큰 힘을 발휘하는 라이브러리 일 경우,  
여러 패키지를 설치 해서 사용 중 React 버전을 업데이트 했을 때  
충돌이 발생하는 경우가 잦아 질 수 있다.  

## 설치한 Package 들

아래는 개발시 사용했던 패키지들 이다.  
기본적으로 설치되어 있는 Package 외에 추가로 설치한 건 다음과 같다.  
(TS 버전으로 설치)

+ axios
+ hangul-js  
  (태블릿 자체 키보드가 아닌 커스텀 키보드 사용으로 한글 입력시 필요하여 설치)
+ moment.js
+ react-navigation
+ redux
+ redux-observable
+ rxjs
+ styled-components
+ typesafe-actions
+ react-native-code-push
+ react-native-config

eslint 나 자잘 한 건 목록에서 빼고 주요 패키지는 위 목록으로 설치 하였는데  
저 목록의 기능 중 가장 좋았던 건 rxjs 와 code-push 다.  
폰트는 spoqa han sans 폰트를 추가 하였고  
Test 관련 패키지는 모두 삭제 하였다.  



## 고통의 시작

장단점은 뒤로 하고 이 글의 목적인 개발 시 마주친 버그들에 대하여 살펴보자.  
(본인은 네이티브 앱 경험 개발이 없고, RN 을 처음 접했다.  
 그렇다. 미리 밑밥 깔아 두는 것 이다.)  
(또 하나 중요한 건 제품 특성 상 Android Tablet 전용으로 만들었기 때문에 iOS 는 패스)  
(또또 해당 버그를 접하며 느꼈지만, 기종이나 환경에 따라 해결방법이 다른 것도 있다.
 한마디로 RN은 아직 깔끔하지가 않다.)


### 1. Android Network Error

처음 API Fetch 를 실행하니 request failed 가 계속 나타났다.  
코드를 이리 뜯고 저리 뜯고 찾아봐도 무엇이 문제인지 알수 없었다.

emulator는 물론 이고 실제 device 에서도 같은 현상이 발생했고,그 외 다른곳  
(web, postman 등) 에서 호출 시 정상 작동을 하니..
이 무슨 아아러니한 일인가

API 가 까칠하게 제품 가려가면서 응답하는 것도 아니고..
해결한 방법은 의외로 간단했다.
permission 에러로 permission 을 추가해주면 된다.

```xml
  <uses-permission android:name="android.permission.INTERNET" />
```

위 코드를 android/app/src/main/AndroidManifest.xml 의 파일에 추가하자.  
```xml
  <manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.yourapp">
    <uses-permission android:name="android.permission.INTERNET" />
    <application>
      ...
  </manifest>
```

본인은 이런식으로 깔끔하게 해결이 되었다.  
혹시나 권한을 추가해도 해결이 되지 않는다면 아래 issue 링크를 열어 토론을 확인해보자.

[RN Android Network Error issue](https://github.com/facebook/react-native/issues/24408#issuecomment-490368508/" target="_blank)



### 2. RN StatusBar Hidden 시 헤더 밀림

제품을 만들었는데 상단에 상태 창을 숨기기 위해

```jsx
  <StatusBar hidden />
```
옵션을 주었다고 하자.

여기서 로그인 화면을 만들고,
아이디를 입력하기 위해 TextInput 에 Focus 를 둘때  
아래에서 virtual keyboard 가 올라온다.  
동시에 헤더 부분이 같이 쭉 올라간다.  

헤더는 그대로 두고 텍스트 창 밑으로 키보드가 나오게 하고 싶은데  
야속한 헤더는 같이 승천한다.  
문제는 승천한 헤더가 keyboard 가 사라진 뒤에도 내려오질 않는 것 이다.  
해당 문제는 기본적으로 softkeyboard 의 설정 문제다.

android/app/src/main/AndroidManifest.xml

```xml
  <activity android:windowSoftInputMode="stateVisible|adjustResize" ... >
```

windowSoftInputMode 는 여러가지 옵션이 있지만  
기본적으로 adjustUnspecified 값이 되어있다.  
상황에 따라 adjustPan 과 adjustResize 를
결정하여 나타낸다.

두 옵션을 살펴보면

adjustPan 은 keyboard 가 올라왔을 때 포커싱 된 input 을 기준으로 화면이 이동하게 된다.
동시에 올라온 키보드에 의해 다른 부분은 가려지게 되고 만약 입력받는 부분이 아래쪽에 있다면
당연히 위 쪽 컨텐츠 역시 가려지게 될 것 이다.

adjustResize 는 keyboard 가 올라왔을때 화면의 크기를 자동으로 조정한다. 화면의 모든 부분이 
보이지만 올라온 키보드로 인해 화면이 줄어든다.

추가 다른 옵션은 아래 링크를 확인하자.  
[android Soft keyboard options](https://developer.android.com/guide/topics/manifest/activity-element.html#wsoft)


자 이제 알아서 결정하는 건 그렇다 치고, 뭘로 결정 되었든 내 헤더는 왜 같이 승천할까  
만약 adjust resize 가 되었다면 헤더는 그자리에 있어야 할 터이고,  
adjust pan 으로 
나타낸다면 헤더가 올라가는 건 이해된다. 그럼 키보드를 내렸을 때  
같이 내려와야 되는 것 아닌가?

커스텀 스타일의 헤더를 사용한 것도 아니고 진실(?)되게 react-navigation 의 옵션을  
그대로 활용하였다.
아래는 내가 작성한 공유 헤더의 옵션이다.  
해당 부분 어디에도 커스텀한 흔적을 볼 수 없다.

```javascript
export const sharedHeader: StackNavigationOptions = {
  headerStyle: {
    backgroundColor: '#fff',
    height: 110,
    borderBottomWidth: 0,
  },
  headerTintColor: '#000',
  headerTitleStyle: {
    fontSize: defaultFontSize,
    fontFamily: FontType.REGULAR,
  },
  headerTitleAlign: 'center',
};
```

StatusBar 의 hidden 옵션을 제거하면 정상 작동하지만, 어떻게든 없애야 한다.

그래서 검색 한 결과 그렇다 버그였습니다.  
[BUG Issue](https://github.com/facebook/react-native/issues/13000)

안드로이드의 자체 버그 였다.  
아마 지금은 해결이 된 것 같으니, 어느 옵션을 사용해도 정상적으로 작동 할 것 이다.  
그래서 windowsoftKeyboard 옵션을 adjustPan 으로 변경하나 해결 되었다.(?)  
그리고 지금은 adjustResize 를 사용하고 있다?.

업데이트가 되서 해결 된건지, 코드가 잘못 된 건지 아직도 미스터리다...  
의도치 않은 삽질이었다.


### 3. Unable to resolve path to module 'react-native-screens'

앱을 실행 시 해당 문구의 에러가 나타났다.  
react-navigation 관련 문제 이다.  
react-navigation 을 사용하기 위한 의존 패키지 중 하나인 react-native-screens 의  
경로를 찾을 수 없다는 건데...
이상하다..분명히 난 설치 했었는데...

어쨌든 react-navigation 에 설명된 패키지를 다시 설치 하였다.  

react-native-reanimated  
react-native-gesture-handler  
react-native-screens  
react-native-safe-area-context  
@react-native-community/masked-view  

설치하니 해당 문구의 에러가 사라졌다.  
만약 설치해도 에러가 난다면 node_modules 를 삭제하고 패키지를 다시 설치해보자.  
그런데 이상하다..분명히 난 설치 했었는데...


### 4. async storage 관련 버그

react-native 에서 lcoal storage 와 비슷하게 쓰기 위해 async storage 를  
설치하여 사용 하던 중 계속 storage 에서 값이 넘어오지 않는 문제가 생겼다.  
(애초에 값이 저장 되지 않았을 수도 있다.) 

async storage 와 sqlite 와 다르다.  
async storage 는 JSON 과 같이 키 와 값 쌍으로 데이터를 저장하는 방식으로  
간단한 데이터를 저장하고 불러오기 좋다.

데이터가 서로 얽혀있고 join 이나 merge 가 필요할 때는 sqlite 를 사용하자.

어쨌든 또 무슨일이냐 하고 부랴부랴 검색을 해보니 같은 문제로 고통받는 사람들이  
있었다.  
[Async Storage issue](https://github.com/react-native-community/async-storage/issues/219)

해결이 된 건지 안된건지 아리송하다.

다만 어떤 상황에서는 되고, 어떤 상황에서는 안되는 이런 자잘한 버그가 있다면  
실제품에 사용하기에는 불안하다고 생각되어 storage 관련 기능은 다른 방법으로 
처리하고 그냥 안쓰기로 했다. (깔끔)

물론 문제가 없다면 계속 사용하면 된다.

추가로 이 블로그 글을 쓰고 3일 뒤 해당 async storage 가 필요한 기능이 
생겨 다시 사용하게 되었다. 
아직까지 문제는 없는 걸 보니 내 코드의 실수였던가...

### 5. Duplicate resources error

처음엔 그랬다.  
빌드도 잘되고 apk 의 이상유무도 없었다.  
하지만 릴리즈 빌드를 위해 app icon image 들을 추가하고    
초기화면과 splash screen 에 사용 할 이미지를 추가하고..빌드를 시작했다.  

그때부터였다. 또다시 말썽이다.

빌드할때 보니 수많은 에러메시지가 나타났지만 핵심적인 이유는  
'Duplicate resources error' 이거다.

andorid 에서 변수명을 처리할때 확장자를 포함하지 않고 파일의 이름으로 
지정한다고 한다. 그래서 혹시 하고 찾아보니 같은 이름의 파일이 있었다.  
이놈의 이름을 변경 해주면 간단하게 해결 될 줄 알았다.  
하지만 그건 RN 을 너무 쉽게 본 나의 오만한 생각이었다.

해결책을 찾아보자. 

android/app/src/res 에 저장된 모든 리소스 파일을 삭제하고
react-native 로 bundle을 만들어 새롭게 리소스를 android 로 배포 하라고 한다.

```
react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
```

해당 명령 실행 후 다시 빌드 했다. 실패.

android/app/src/main/raw/res 의 모든 파일을 지우면 된다고 한다. 실패.  
성공한 사람은 부럽다.


node_modules/react-native/react.gradle 파일에서
doFirst 함수뒤에 다음 함수를 추가하라고 한다. 

```javascript
  doLast {
    def moveFunc = { resSuffix -> File originalDir = file("$buildDir/generated/res/react/release/${resSuffix}");
  if (originalDir.exists()) {
    File destDir = file("$buildDir/../src/main/res/${resSuffix}");
    ant.move(file: originalDir, tofile: destDir);
  }}
    moveFunc.curry("drawable-ldpi").call()
    moveFunc.curry("drawable-mdpi").call()
    moveFunc.curry("drawable-hdpi").call()
    moveFunc.curry("drawable-xhdpi").call()
    moveFunc.curry("drawable-xxhdpi").call()
    moveFunc.curry("drawable-xxxhdpi").call()
    moveFunc.curry("raw").call()
  }
```

신기하게 해당 코드를 추가하니 release build 가 성공하였다.  
그런데 node_modules 내부 파일을 조작하라니..이 무슨 말도 안되는 해결법인가

일단 위 방법은 정 급하면 사용하기로 하고
다른 방법을 찾아보았다.

drawable/* 폴더와 raw 폴더를 제거한후 react-native bundle 을 거치지 않고
android studio 에서 release apk 를 직접 만들라고 한다.  
그 뒤 debug apk 를 빌드할 때는 react-native bundle 을 거쳐서 만들라고 한다.

결국 android studio 를 거치니 빌드가 진행되었다.  
release 빌드는 빈도가 많은 편은 아니지만  
빌드할 때 마다 android studio 를 거쳐야 한다면 이는 여간 불편한게 아니다.

RN 의 최신버전을 설치 하였지만 그래도 바뀌지 않았다.  
android studio 에서 된다는 건 resource 에는 문제가 없다는 뜻이 아닌가?  
결국 node_modules 내 파일을 수정해야 한다는건 RN 의 빌드 방식에 버그가  
존재한다는 뜻 이다.  
처음부터 같은 이름의 리소스를 지정하지 않으면 되지만, 한번의 실수로 해결하기 위한  
방법이 너무 가혹하지 않은가

혹시 깔끔한 해결방법을 알고 있다면 꼭 알려주길 바란다.

아래는 해당 이슈에 대한 링크다.  
[Duplication Resource error](https://github.com/facebook/react-native/issues/26245)


### 6. Deprecated Gradle Error

Deprecated Gradle features were used in this build, making it incompatible with Gradle 6.0.

emulator 의 target API 를 27 (8.1) 로 변경하여 테스트 중 빌드시 해당 에러가 나타났다.  
내가 뭘 잘못했길래 또 괴롭히지 하며 해결 방법을 찾아보았다.

역시나 같은 문제로 고통받는 동지들이 있었다.  
[Deprecated Gradle Error](https://github.com/software-mansion/react-native-gesture-handler/issues/640)

차근차근 해결법을 실행해보자.

jetify 를 실행 하라고 한다.  
AndroidX 로 migration 할때 RN의 종속성으로 설치 되어있는 패키지 중  
기존 java 코드를 AndroidX 로 변환해줘야 정상적으로 작동한다.  
문제는 새로운 패키지를 설치 할때 마다 마이그레이션을 해줘야 되는데
번거롭게 설치때마다 마이그레이션을 해줄 수 없으니 RN 을 실행할때 패키지들의 기존 Java 코드를 AndroidX 로 변환 시켜주는 것이 이놈의 역활이다.

그렇다면 위 해결법은 migration 이 제대로 되지 않아 발생한 문제인가?  
위 해결법으로 고쳤다는 사람도 있지만 나는 실패 하였다.

그럼 다른 방법으로 ./gradlew clean 을 한 뒤 ./gradlew :app:bundleRelease 를 실행하여
릴리즈 용 번들을 생성하라고 한다. 

그러나 역시 실패.


다음 방법으로는 
node_modules\metro-config\src\defaults\blacklist.js 의 파일을  
수정하라고 한다. 또 node-modules 내의 파일을 수정해야 하는가 ? 이 방법은 패스.

그 외 여러 방법이 있었지만 결국 해결한 방법은  
android/.gradle 폴더 삭제  
android/app/build 폴더 삭제

그런 뒤 빌드가 정상적으로 작동하였다.

사실 이 폴더를 삭제 전에 다른 방법 몇을 실행해서 정확히 폴더를 삭제하는 방법이
올바르게 작동하리라 장담할 수 없다.

아래 이슈를 보자.  
[build gradle error](https://github.com/software-mansion/react-native-gesture-handler/issues/640)

같은 이슈인데 해결법은 제각각이다.
정상적으로 보이진 않는다.


### 7. Unable to resolve module `./debugger-ui/ui.cc464243.js

이번 에러는 가장 최근에 나타났던 에러로 package 버전을 업데이트 하고 나타났던 걸로 기억한다.
실행시 해당 에러가 나타났고, 앱이 제대로 작동하지 않았다. 

자 또 해결법을 찾아 떠나보자.

빠르게 이슈를 확인했다.  
[debugger-ui error](https://github.com/react-native-community/cli/issues/1081)

package-lock.json 과 yarn-lock 을 삭제하고
패키지를 다시 설치 하라고 한다.
안된다. 

package.json 에 resolutions 으로  
@react-native-community/cli-debugger-ui": "4.7.0"  
추가 하라고 한다.  
해당 항목은 설정한 패키지를 의존하는 타 패키지에서 설정한 버전으로만 해당 패키지를  
사용하도록 하는 것 이다.

해당 항목을 추가 하니 문제가 해결되었다.
아마 패키지 버전 업그레이드 도중 debugger-ui 의 버전과 충돌이 났던 것 같다.


## RN 개발 후기

### 장단점?

이 외에도 자잘한 버그가 있었지만 기록을 해두지 않아 적을수가 없다.
개인적인 생각으로는 RN 은 아직 안정화 되지 않은 것 같다. 처음 접한 RN 이라 내가 실수한 부분도 많을 것 이다.
하지만 개발하며 이정도로 스트레스를 받게 될 줄은 몰랐다.  
react 자체는 굉장히 좋은 라이브러리 지만 react-native 는 글쎄..

앱 퍼포먼스 적으로는 나쁘지 않았다.
1gb ram 의 예전 고물 태블릿으로도 괜찮게 돌아가는 걸 보여줬다.
다만 target API 버전을 변경할때 일부 style이 제대로 표현되지 않아
수정이 필요했다. (특히 애니메이션..)  

하나 아주 마음에 들었던 건 code push 기능  
code push 가 위 모든 단점을 날려버리고 RN 개발을 고려할 만큼 좋다.
정말 편하고 좋다.
거기다 무료다. + MS 에서 관리하니 문제 생길 점도 거의 없다.  

### Ionic ?

사실 지금 나온 제품도 조만간 ionic 이나 flutter 로 변경 할 예정이다.  
버전 업데이트마다 충돌없기를 문제없기를 기도해야 하다니..

아마 ionic 을 활용할 확률이 높긴 한데 (정확히는 stencil 로 개발)  
stencil 은 순수 웹 컴포넌트를 만들어주는 컴파일러 이다.
웹 표준을 따른 이 웹 컴포넌트는 프레임워크 구분없이 어디든 사용할 수 있으며    
ionic 은 이미 모든 컴포넌트들이 stencil 을 활용한 웹 컴포넌트로 빌드 된다.  

추가로 capcitor 를 활용한 android, ios, pwa, electron 의 동시 배포는  
진정한 크로스 플랫폼 하이브리드 울트라 앱 이라고 할 수 있다.  
조만간 이 거대한 물결에 대해 별도로 글을 써보려 한다.  

### Flutter ?

flutter 는 그냥 진짜 그냥 좋다.  
정말로 개발하기에도 너무 편하고, 빠르고, 깔끔하다.  
RN 으로 개발 하다 중간에 Flutter 로 했을때 정말 신세계를 보았다.  
Dart 언어는 전혀 까지는 아니지만 크게 문제 되지 않는다.  

마크업 할때 선언적으로 작성하는 방법도 좋고  
자체적으로 stream 을 지원하는 부분도 매우 마음에 든다.  
이외에도 개발 할때 debug 모드는 환상적으로 편하고, 보기 좋다.  
hot reload 기능은 말 할 것도 없고, Skia 엔진을 이용한 렌더링은
화면을 백색 도화지로 만들고 다시 페인팅 하기 때문에  
Android 는 이렇게 넣어주고, iOS 는 요렇게 넣어주고 할 필요가 없다.  
둘의 화면은 똑같다. 심지어 버전이 낮아도 어쨌든 완전히 다시 그리기에 똑같다.  

이 외에도 많은 세일즈 포인트가 있지만, 나머진 다음 번에 정리 해보겠다.  

flutter 가 code push 를 지원한다면 고민도 없이 flutter 를 사용하겠지만
flutter 구조 상 어려워 보이며 구글에서는 아직까진 계획한 부분이 없는 것 같다.


### React Native ?

fast refresh 도 업데이트 되고 개발하기 더욱 편리해 진 건 사실이다.  
다만 개인적으로는 RN 에 좋은 인상을 받지 못 했다.  
React 의 성공으로 그냥 같이 찬양받는 정도 ?  
친숙한 React 를 쓴다는 것 외에 무엇이 장점인지 아직 모르겠다.  


이후 ionic 이나 flutter 로 변경한다면
그때는 RN 과 비교 후기를 한번 적어보려 한다.



