---
title: "Upgrade Project"
date: "2024-08-18"
description: "Rspack, Federation runtime, 회고"
---

![ff](./1.png)

현재 재직중인 회사의 프로젝트는 거대한은 아니고 큰 monorepo 로 이뤄져 있으며  
root 의 package.json 에 각 모듈이 사용하는 모든 package 들이 정의되어 있다.

이렇게 `singleVersionPolicy` 를 사용하게 되면 각 모듈이 별도의 버전을 가지는 것에 비해  
내부 모든 코드가 호환되고 일관성이 생기며, 특정 package 를 업데이트 할때 전체 모듈에게  
한번에 배송된다는 장점이 있다.

monorepo 구조의 개발과 배포에 대한 부담감을 상당히 줄여주는 package 중 하나는  
`turborepo` 또는 `nx` 가 있겠다.

이는 많은 수의 개별 모듈을 만들고 실행할때 명령어들을 하나로 압축하여  
한번에 관리 할수 있는 아주 편리한 기능을 제공해주며, caching 으로 인해 시간의 손실을  
현격히 줄여준다.

또 하나로 흔히 말하는 `micro frontend` 구조를 위해 `module federation (mfe)` 를  
사용하고 있는데 이는 모듈의 변경사항을 적용할때 각모듈을 이어주고 런타임에서  
적용시켜주는 아주 고마운 기능을 제공해준다.

위 2가지 핵심기술과 나머지 도구들을 조합하여 몇년전부터 계속 프로젝트를 진행하던 중  
나는 슬슬 속도에 불만이 생기기 시작했다. 🤔

우리는 `shared` 한 기능을 수정하거나 `internal package` 가 변경될때  
모든 모듈을 다시 `build` 하고 배포해야 하는 경우가 종종 생기게 되는데  
현재 모듈이 약 40개 가까이 만들어져 있으므로 CI 에서 속도가 점점 느려지기 시작했다.

이를 개선하기 위해 각 CI 단계에서 실행되는 명령어중 속도를 올릴수 있는 도구로  
변경해 보기로 했다.

## lint

eslint 는 역사가 깊고, 커스텀할 수 있는 영역이 굉장히 많아 대부분의 개발자가 사용하는  
범용적인 linter 이다.

사실 lint 자체의 속도는 그렇게 큰 이슈가 되지 않았지만 가장먼저 만만해 보이는 lint 먼저  
rust 기반의 `oxlint` 로 변경했다.

확실히 변경 후 속도가 10초 이상을 가는 적이 없을 정도로 효과가 어마어마 했다.  
`oxlint` 로 변경할때 `eslint` 의 구성을 가져다 쓸수도 있고, 자체적으로 왠만한 범용규칙은  
가지고 있기 때문에 변경하는데 큰 어려움은 없었다.

## tsc

우리는 pr 이든 push 든 모든 부분에서 `noEmit` 상태로 `tsc` 를 실행한다.  
다만 `tsc` 의 속도는 발전했다고는 하나 아직 여전히 느리다. 내생각에는.  
CI 에서 다른 부분의 속도가 빨라지게 되니 tsc 의 시간이 차지하는 지분이 점점 많아졌다.

이미 2020년에 `noEmit` 상태에서 `incremental` 의 옵션을 적용 가능 하기 때문에  
CI 에서 해당 옵션을 적용할 수 있도록 caching 을 손보기 시작했다.

적용 후 어느정도 빨라지긴 했지만 아직은 만족할 수 없다.  
이제 rust 기반의 툴에 익숙해진 탓이다.

## webpack

이외에 다른 부분도 자잘하게 변경하여 시간의 손실을 조금씩 막았지만, `webpack` 의  
빌드 부분은 최적화를 하고 또 해도 한계가 있어보였다.

기능 구조를 바꾸고 모듈을 더 쪼개고 각 모듈이 적은 코드를 가질 수 있도록 변경해도  
속도에 대해서는 그렇게 큰 이점을 얻지 못했다.

`webpack` 의 최적화는 속도보다 최종 결과물의 용량에 대해 더 관여하는 느낌이었다.

그래서 결국 이전부터 눈여겨보던 `rspack` 으로의 변경을 시도했다.  
때마침 `rspack` 에서 `1.0.0 alpha, beta` 버전이 출시 되기 시작했다.

## 변경하기 전에

특정 패키지를 변경할때 뿐만 아니라 기능을 변경하거나 추가할때, 어쨌든 하위호환이 가능하도록  
유지하고 점진적으로 프로젝트를 변경해야 한다.

번들러가 변경된다고 내부 코드에서 특정 무언가를 변경하는 경우가 없도록 해야 한다.  
이 점을 최대한 유의하며 작업을 시작했다.

## webpack plugin

번들러 변경시 첫번째로 걱정된점은  
우리는 `tailwindcss` 를 주력으로 사용중이며, module 간 tailwind 의 treeshaking 으로  
만들어진 css 정의가 중복되면 안되고, `css cascade` 에 서로 영향을 받지 않도록  
만들어야 했다.

이를 위해 별도의 `webpack plugin` 을 자체적으로 만들어 각 모듈이 build 될때  
module의 이름이 `prefix` 로 담긴 `css 파일`과 `className` 을 만들어 주도록 했다.

다행히 `rspack` 에서는 기존 webpack 의 plugin 과 호환성을 가지도록 인터페이스가 제공되어  
특별히 해당 plugin 을 변경 할 필요는 없었다.

## module federation

`webpack` 과 `rspack` 에서 빌드된 파일들이 기존 프로젝트에서 서로 호환이 유지되어야 했다.

`module federation core` 팀은 번들러에 내장된 기능을 사용하는 것이 아닌  
`module federation runtime` 으로 새롭게 분리하여 특정 번들어에 종속되지 않고  
federation 기능을 사용할 수 있도록 만들었다.

그래서 먼저 `module federation runtime` 을 활용하여 federation 의 역활과  
번들러의 역활을 명확하게 나누어 새로운 구조를 만들었다.

이제 `webpack` 으로 빌드를 하던, `vite`, `rspack` 으로 빌드를 하던 mfe 는 그에 상관없이  
`runtime` 에 remote 와 host 가 잘 통합된다.

## module federation plugin

mfe 가 별도의 라이브러리로 분리되면서 기존에 있던 불편한점이 많이 사라졌다.  
예를 들면 `dynamic remote load` 를 할때 `new promise` 를 사용하는 짜치는 방법에서  
이제는 runtime 에 포함된 기능으로 간단히 구현이 가능한다.

> 분리되면서 federation 의 기능을 좀더 세밀하게 제어할 수 있는 인터페이스가  
> 많이 생겼다. 공식 홈페이지를 참고해보자.

이번에 구조를 바꾸면서 공통적으로 사용 할 2가지 `plugin` 을 추가 했는데,  
첫번째는 기존 webpack 의 plugin 으로 사용하던 `external remote plugin` 을  
mfe 의 plugin 으로 옮겨서 적용했다.

```javascript
import { FederationRuntimePlugin } from "@module-federation/enhanced/runtime"

function externalRemoteLoadPlugin(): FederationRuntimePlugin {
  return {
    name: "external-remote-load-plugin",
    beforeRequest: args => {
      const { options, id } = args
      const remoteName = id.split("/").shift()
      const remote = options.remotes.find(remote => remote.name === remoteName)
      if (!remote) {
        return args
      }

      // @ts-ignore
      if (remote?.entry?.includes("?t=")) {
        return args
      }

      // @ts-ignore
      remote.entry = `${remote?.entry}?t=${Date.now()}`
      return args
    },
  }
}
```

이러면 `remoteEntry.js` 파일에대해 `cache busting` 을 plugin 없이 적용 가능하다.  
`manifest.json` 파일을 사용 할 경우 추가 코드가 필요하지만 맥락은 같다.

또 다른 하나는 `hmr` 과 `react-dom` 와 관련된 부분이다.

기존에 local 에서 특정 host 와 remote 를 연결해서 개발할때 자체적으로 만든 명령어를  
사용하여 각 모듈을 개발 서버로 띄워서 hmr 기능을 활용하도록 만들었다.

다만 `react` 에서 `context` 의 공유 문제나 특정 모듈이 먼저 로드 될때 (=design-system)  
shared 로 설정된 `react` 와 `react-dom` 를 어떤 모듈에서 가져와 사용할지에 대해  
애매한 부분이 있었다.

아마 `shared` 에 대한 설정이 기본적으로 `version-first` 이기 때문에 실제로는  
마지막에 load 한 모듈에서 사용하는 것으로 설정이 된다.  
그렇다고 미리 가져온 shared 모듈을 다시 불러온다는 뜻은 아니다.  
출처만 변경 된다는 것이다.

왠만한 경우에서는 큰 문제가 되지 않을 것이다. (또는 eager 를 사용하면 해결은 된다.)  
다만 `eager 옵션의 사용은 최대한 자제`하고, 강제적으로 현재 `host` 에서  
`react` 와 `react-dom` 을 사용하도록 하기 위해 두개의 package 는  
host 에서 가져오도록 강제하는 plugin 을 추가 했다.

이는 local 에서 개발할때 hmr 적용 시 `host` 의 `react-dom` 을 사용하도록 만들고,  
배포 된 후에는 최상위 `root` 의 `host` 모듈에서 `react` 와 `react-dom` 을 가져가도록 한다.

```javascript
    resolveShare(args) {
      if (args.pkgName !== 'react' && args.pkgName !== 'react-dom') {
        return args;
      }

      const {
        shareScopeMap,
        scope,
        pkgName,
        version,
        GlobalFederation } = args;
      const host = GlobalFederation['__INSTANCES__'][0];

      if (!host) {
        return args;
      }

      args.resolver = function () {
        const hostScope = Array.isArray(host.options.shared[pkgName])
          ? host.options.shared[pkgName][0]
          : host.options.shared[pkgName];

        if (hostScope) {
          shareScopeMap[scope][pkgName][version] = hostScope;
        }

        return shareScopeMap[scope][pkgName][version];
      };

      return args;
    },
```

plugin 의 interface 중 `resolveShare` 에서 공유 모듈을 어떤식으로 지정할지에 대한  
정의를 해주었다.

위 plugin 의 기능은 SPA 에서는 없어도 잘 돌아갈수 있으나 일종의 보험 같은 것이다.

나머지 `remote load` 에 대한 `에러처리`와 `초기화`와 관련해서 몇가지를 더 추가해서  
federation 이 잘 돌아갈수 있도록 안정성을 높여두었다.

## module federation dts

이번 federation 설정에서 자체적으로 remote 의 `ts type` 을 생성해주는  
기능을 포함해서 나왔다. 이전에는 분리되어 있던 plugin 이지만 요즘엔 ts 를 안쓰는 프로젝트를  
찾는게 더 힘드니 당연히 포함되서 나온 듯 하다.

해당 기능으로 인해 remote 로 가져오는 모듈에 대해 ts 의 자동완성 기능을 더 잘 활용할수  
있고 자체적으로 d.ts 를 만들 필요가 없어졌다.

다만 `dev` 옵션이라고 개발중에 실시간으로 `tstype` 을 생성해주는 기능이 있는데  
현재 `매우 느리기 때문에 사용을 비추`한다.

## rspack

`rspack` 으로의 전환은 그렇게 큰 문제는 있지 않았다.  
rspack 에서 webpack 과의 호환성을 워낙 잘 맞춰둔 것도 있고  
webpack 에서 했던 여러 설정들이 하나로 합쳐진 부분도 있고 해서 더 간소화 시킬 수 있었다.

주요 변경점은 `csslodaer` 의 사용변경과 기존에는 `esbuild` 로 빌드하고  
`swc` 로 `polyfill` 을 넣어 주고 있었는데 이제는 `swc` 로 통일 되었다는 점?

나머지 짜잘한 설정들은 시행착오를 겪으며 조금씩 수정하여 모든 모듈을 빌드 버전으로  
local 에서 테스트 한뒤 전환을 하였다.

아마 webpack 관련 설정은 안정화 되면 약 1개월 뒤 삭제 될 것이다.

`rspack` 으로 전환 후 결과적으로 빌드 속도가 3배는 빨라진듯하다. `붉은혜성` 같다.

## 추가 변경

그외 회사 자체 lib 를 모아둘 패키지를 만들어 버전 관리를 하기 시작하였고  
이는 추후 오픈소스로 내보낼수 있다면 좋을 것 같다.

그리고 폴더구조나 명령어삭제,추가 등 조금더 개발을 빠르고 편하게 사용할 수 있도록  
변경을 조금 하였다.

중요한점은

> 변경된 구조와 package 가 적용되는 도중에도  
> 누구도 현재 개발작업에 방해를 받지 않았고  
> 변경된 후에도 이전과 같은 명령어로 똑같이 개발이 가능하다는 것이다.

물론 변경된 후 구조나 변경점에 대해 설명은 하였다.  
포인트는 이렇게 `대규모 변경을 할때도 하위호환을 유지하는 것`과  
`breaking change 를 최대한 줄이는게 아주 중요`하다는 것이다.

인원이 많고 연구할 시간이 많은 대기업에서는 모르겠지만,  
빠르게 움직여야 하는 기업이나 팀에서는 기존 작업에서 오류가 생기거나  
작업에 방해되는 부분이 생기면 많은 부분에서 손실이 클 수 있다.

어쩔수 없는 부분이 생길수도 있지만 잘 생각해보면 방법은 있을 것이다.🤡

## 회고

프로젝트 업그레이드 회고 인데 module federation 에 대한 설명이 많은 것 같다.  
그만큼 현재 fe 에서 중요한 부분을 담당하는 기능이기도 해서 그런듯.  
더 설명하고 싶은 부분이 많지만 너무 글이 길어질 것 같아서 피곤해서 끝

궁금점이나 논의 하고 싶은 부분은 언제든지 문의 주길 바란다.
