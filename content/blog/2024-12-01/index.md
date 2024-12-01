---
title: "SPA 에서 사용하는 Hot Remote Module Replacement 실험"
date: "2024-12-01"
description: "feat: Module Federation"
---

SPA 프로젝트에서 MF를 사용할때 remote 모듈이 업데이트 되면 새로운 remote 모듈을  
사용하기 위해 몇가지 방법이 존재한다.

그전에 간단하게 remote를 불러오는 과정을 보면  
먼저 `vite`, `webpack`, `rspack`, `rsbuild` 와 같이  
특정 번들러에 미리 설정하는 방법과 `FederationRuntime` (이라 runtime) 에  
설정했을때와 동작방식이 조금 다르다.

번들러에 설정했다면 빌드 타임에 불러와야 하는 remote 정보가 등록되며 페이지가 로드될때  
즉시 `remoteEntry` (또는 `manifest`) 파일을 불러온다.

반대로 runtime 을 이용한다면 내가 federation 을 초기화 할수 있는 시점을  
정할 수 있고 실제로 `Init` 이 어디에 선언되었는지에 따라 초기화를 시작한다.

추가로 runtime 에서 제공하는 함수들을 이용해 동적으로 remote 를 등록하고  
불러오거나 각종 설정을 변경 시킬수 있다.

각각의 장단점이 존재하는데 번들러에 포함시킬 경우 `import` 문을 통해 정적으로  
미리 불러올 수 있다는점?이 장점이 될수 있다.  
자세한 차이점은 공식 홈페이지를 찾아보자.

어쨌든 불러온 `remoteEntry` 정보에는 실제로 expose 한 모듈의 소스코드 위치와 이름이 있고  
global instance 에 해당 코드를 가져오기 위한 factory 함수가 등록되며, 각 모듈에게  
`moduleId` 가 등록된다.

이제 remote 가 불러오는 시점, lazy 하게 가져오도록 설정했다면 해당 코드가  
렌더링 되는 시점이고,  
만약 정적으로 불러온다면 페이지가 처음 로드되는 순간 바로 불러오게 된다.  
이때 아까 부여받은 `moduleId` 를 참조해 federation 소스 코드를 불러오게 된다.

이제 여기서 특정 모듈을 변경하여 업데이트 한 경우를 생각해보자.  
변경된 remote 모듈 을 배포하게 되면,  
사용자는 이제 새로운 remote 모듈을 사용할 수 있다.  
하지만 브라우저 환경에서 이를 사용자에게 자연스럽게 적용시키는 방법이 필요하다.

특히 브라우저는 아마 처음에 불러온 `remoteEntry` 정보를 캐싱하고 있을 확률이 높다.  
이걸 업데이트 된 새로운 코드로 적용시키는 방법은 뭐가 있을까?

## 새로고침

가장 깔끔하고 정확한 방법이다.  
다만 위에 적었듯이 브라우저는 `remoteEntry` 파일을 받았을때 이를 자체적으로 캐싱을  
하고 있을 것이다.

이럴때는 일반적인 새로고침이 아닌 캐시 무효화 새로고침을 하거나,  
아니면 cache 정책을 설정해 cache 를 하지 않도록 하고,  
추가로 cdn 을 통해 코드를 공급받고 있다면 cdn 의 캐시도 무효화 해야 할 것이다.

## 수동으로

runtime 에서 공개한 함수들을 통해 특정 remote 를 다시 불러오도록 할 수 있다.

```javascript
const [showComponent, setShowComponent] = useState(false)
const replaceRemote = () => {
  console.log("replaceRemote click")
  registerRemotes(
    [
      {
        name: "dynamic_remote",
        entry: "http://localhost:3056/mf-manifest.json",
      },
    ],
    { force: true }
  )

  setShowComponent(true)
}
```

이런식으로 함수를 만들어 해당 remote 를 다시 등록시켜 새로운 remote 를 불러오는  
방법도 있다.

## 문제점

위 방법들은 사용자가 원할때 새로운 모듈을 받을 수 있도록 할수 있은 좋은 방법들이다.  
다만 내가 겪었던 문제들 중 한가지 경우를 소개해본다.

우리는 `s3 + cloudfront` 조합을 사용중이고 실제 각 모듈의 소스코드는 s3 에 모두  
저장되고 있다.

배포를 하게되면 s3 에 특정해둔 각 모듈 별 폴더 내 모든 파일이 클리어되고  
새로운 파일로 채워지게 된다.

이전 파일들을 모두 지우는 이유는 모듈이 너무 늘어나게 되면서 s3 에 너무 많은 파일이  
저장되고 있었다.

이를 주기적으로 삭제해야 하는데 이 또한 리소스가 들어가기 때문에  
그냥 배포 할때 자동으로 이전 파일들은 모두 지우고  
무조건 최신버전을 제공하도록 하려고 했다.

물론 s3 에서 자동으로 특정 기한이 지난 파일을 지우도록 하는 방법도 있긴 하다.

> 사용자 경험을 생각하면 좋은 방법은 아니다.

어쨌든 여기서 문제는 위에 적었듯이 `host` 가 실행될때 해당 `remoteEntry` 정보들을  
미리 불러오는데 만약 정적으로 모듈을 불러왔다면 해당 소스 파일들을  
미리 불러오기 때문에 대상 모듈이 업데이트 되어도 캐싱으로 인해 문제없이 작동을 하게 된다.

문제는 `lazy` 하게 불러오는 컴포넌트다.  
예를들어 처음 로드될때 `A` 의 `remoteEntry` 정보를 불러와서 remote 의 factory를  
만들고 remote 정보를 등록한다.

그리고 현재 `A` 가 `expose` 한 컴포넌트는 사용되지 않았기에 실제 소스코드는 불러오지  
않은 상태다.

여기서 2번 페이지로 이동했을때 `A` 의 컴포넌트를 `lazy` 하게 불러온다고 생각해보자.

일반 적인 경우라면 문제 없겠지만 만약 사용자가 2번 페이지로 가지 않은 상황에서  
`A` 모듈을 업데이트 한뒤 배포 했다면 어떻게 될까?

사용자가 2번 페이지로 갔을때 브라우저 에서는 미리 불러온 `entry` 정보를 참조해서  
업데이트 된 module 이 아닌 이전 module 의 소스코드와 주소를 가리키고 있을 것이다.  
하지만 이미 s3 에는 해당 소스코드가 없고 새롭게 생성된 소스코드만 존재한다.

이제 브라우저는 해당 코드를 가져오지 못하고 `A`의 컴포넌트는 위에 설명한 방법으로  
다시 불러오기 전까지는 사용하지 못하게 된다.

## 해결방법

실제로 특정 모듈이 업데이트 되었을때 사용자에게 브라우저 새로고침에 대한 안내가  
자동으로 나타나도록 설정은 되어있다.

하지만 이건 강제가 아니기 때문에 업데이트를 하지 않고 사용하게 되면 오류를  
맞닥뜨릴 상황이 일어날 수 있다.

> 아니면 S3 에 이전 업데이트 파일들을 남겨두면 좋지 않을까?

그렇다.  
그러면 사용자는 오류 없이 제품을 계속 이용할 수 있고 원할때 새로고침으로  
업데이트 하면된다.

사실 이게 가장 좋은 사용자 경험의 예이다.  
다만 이는 깊게 들어가면 결국 소스코드 version control 이 필요해지는 상황이 온다.

그리고 만약에 주요 오류를 수정한 핫픽스라면?  
사용자 모두가 지금 빨리 빠르게 최신 버전으로 업데이트 해야 한다면?

## 또 다른 방법

그래서 생각한게 그냥 사용자가 모르게 업데이트를 시켜버리면 되지 않나? 라고 생각했다.  
새로고침을 할 필요도 없고, 수동으로 버튼을 클릭해서 다시 불러오는 행위 없이  
그냥 해당 컴포넌트들이 자동으로 최신버전으로 변경되도록 하고 싶었다.

보통 실제로 사용자가 활발히 사용하는 시간에 배포한다는 것은 오류로 인한 핫픽스 이거나  
style 수정 및 UI 수정 등이 대부분이다.

주요 새로운 기능이나 업데이트는 정기적인 배포시간을 통해 하는것이 안정적이기 떄문이다.

다만 조그마한 핫픽스 수정으로 인해 사용자가 오류를 보게 되는 불행한 상황을 피하고  
사용자의 흐름을 끊기게 하고 싶지 않았다.

하여 자동으로 업데이트 된 모듈을 불러오는 플러그인을 만들었다.

## replaceModulePlugin

방법은 단순하다.  
모듈을 불러올때 소스코드 업데이트로 인해 factory 를 만들지 못하게 되면  
해당 모듈을 최신 코드로 다시 가져온 뒤 factory 를 다시 등록하면 된다.

```javascript
    async getModuleFactory({ remoteEntryExports, expose, moduleInfo }) {
      let moduleFactory;
      let attempts = 0;
      while (attempts - 1 < 3) {
        try {
          if (attempts > 1) {
            const remoteEntryExportsNew = await replaceRemote(moduleInfo);
            if (remoteEntryExportsNew) {
              moduleFactory = await remoteEntryExportsNew.get(expose);
              break;
            }
          }
          moduleFactory = await remoteEntryExports.get(expose);
          break;
        } catch {
          attempts++;
          await new Promise((resolve) => {
            setTimeout(resolve, 1000);
          });
        }
      }

      return moduleFactory;
    },
```

plugin 에는 `getModuleFactory` 라고 공개한 함수가 있다.  
`lifecycle` 로 보면 remoteEntry 에 등록된 모듈을 불러올때 실행되고  
해당 모듈의 factory 를 return 해야한다.

여기서 오류를 포착했을때 일단 `factory is not a function` 오류를 지연시키고  
해당 remote 모듈을 다시 불러와서 등록 시켜야 한다.

위 코드는 예제로 현재 3번 retry 하게 되어있고 만약 3번 까지 시도했음에도 동작이  
안된다면 이는 호스팅 서비스나 네트워크 문제일 확률이 높다.

```javascript
try {
  if (attempts > 1) {
    const remoteEntryExportsNew = await replaceRemote(moduleInfo)
    if (remoteEntryExportsNew) {
      moduleFactory = await remoteEntryExportsNew.get(expose)
      break
    }
  }
  moduleFactory = await remoteEntryExports.get(expose)
  break
} catch {
  attempts++
  await new Promise(resolve => {
    setTimeout(resolve, 1000)
  })
}
```

while 문 안에 있는 내용은 만약 attempts 가 1을 넘어가면 그때 새로운 module 을  
등록하는 절차를 시작하게 된다.

이유는 위 `getModuleFactory` 함수는 오류가 있든 없든 무조건 실행되기 때문에  
정상적인 remote 들은 새로 불러올 필요가 없다.

2번째 시도 부터는 오류라고 판단하고 새롭게 remote 를 불러와서 등록하게 된다.

각 재시도 간격은 1초로 정하고 실제로 화면에서는 `suspense`로 인해 커스텀하게  
만들어둔 UI 가 표시되고 있다.

```javascript
const replaceRemote = async moduleInfo => {
  let remoteEntryExports
  await registerRemotes(
    [
      {
        name: moduleInfo.name,
        shareScope: moduleInfo.shareScope,
        alias: moduleInfo.alias,
        entryGlobalName: moduleInfo.entryGlobalName,
        entry: `${moduleInfo.entry}?t=${Date.now()}`,
        version: moduleInfo.version,
      },
    ],
    {
      force: true,
    }
  )

  const host = getInstance()
  if (host) {
    const { module } = await host.remoteHandler.getRemoteModuleAndOptions({
      id: moduleInfo.name,
    })
    remoteEntryExports = await module.getEntry()
  }

  return remoteEntryExports ?? null
}
```

replace remote 는 moduleInfo 정보를 받아와서 새롭게 remote 를 등록하고  
`host` 정보를 불러온다.

그리고 현재 `host` 의 `remoteHandler` 에서 오류가 난 module 의 정보를 가져와서  
새롭게 remoteEntry 를 구성하고 이를 return 하게 된다.

이때 가져온 모듈의 정보는 새롭게 remote 를 등록했기 때문에 최신버전이 적용된  
모듈의 정보다.

여기서 `force:true` 같은 경우 해당 remote 를 다시 불러오면서 기존에 있는  
`module cache` 를 지우게 되는데 주의할 점은 해당 remote 가 가지고 있는  
모든 remote 모듈의 cache 도 지우게 된다.

예를 들어 B 모듈을 가져오는데 B모듈이 remote 로 C 모듈을 사용하고 있다면,
B 와 C 둘다 moduleCahce 에서 삭제되고 다시 등록된다.

만약 여기서 C 모듈이 singleton 으로 특정 state 를 공유하는 있는 특정 코드이고  
다른 모듈에서 사용중이라면 side effect 가 생길 수도 있다.  
보통 그런 경우는 잘 없겠지만 사용할 때 신중하게 사용해야 한다.

그리고 singleton 으로 state 를 공유하는 모듈을 remtoe 로 사용하는 건  
추천하는 remote 방식이 아니다.

어쨌든 여기서 새롭게 만든 remoteEntry 정보룰 가지고 `getModuleFactory`에서  
다시 등록하게 되면 정상적으로 최신 코드가 반영된 모듈을 사용할 수 있게 된다.

현재 실험중에는 큰 오류는 없었지만 실제로 프로덕션에 적용했을때 어떤 사이드 이펙트가  
생길지 모르기 떄문에 특정 모듈을 시작으로 점진적으로 적용해보려 한다.

federation 팀에서 좀더 원하는 함수를 더 제공해주면 좋겠지만...  
우리 제품이 특수한 경우라 일단 번거롭게 이런 방법을 사용해야 한다.  
나중에 시간되면 pr 을 만들거나 제안을 해봐야 겠다.

## 끝

이로서 사용자는 새로고침을 할 필요도 없고 뭔가 어떠한 행위없이 최신 코드가 올라갔을때  
자동으로 새로운 코드가 적용되도록 할 수 있게 되었다.

만약 ssr 을 사용한다면 좀 더 쉬운 방법이 있지만 spa 에서는 이런 방법이 절충안이다.  
좀더 좋은 방법이 있다면 누가 알려주면 좋겠다.

나중에 안전한 모듈만 replace 시키는 filter 도 만들고, `registerRemotes` 를  
사용하지 않고 오류가 난 remote 만 직접 `moduleCache` 를 조작하는 코드로  
수정해보는 것도 좋아보인다.

rust 와 node, remix 로 만들어본 passkey 예제도 다 만들고 다듬는 중이라..  
아마 다음 글에는 나올듯
