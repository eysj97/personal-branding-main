// window.onload() 로 전체 감싸준다
// onload 참고 링크 -> https://inpa.tistory.com/entry/JS-%F0%9F%93%9A-windowonload-%EC%A0%95%EB%A6%AC

window.onload = function() { // 스크립트 시작
    
// [ 스크립트 1 - 페이지 로딩 애니메이션 ]

// 1-5. loading (로딩) 애니메이션만 먼저 작성
// querySelector() -> https://velog.io/@hikoand/TIL-querySelector-querySelectorAll-%EC%9D%84-%EC%9D%B4%EC%9A%A9%ED%95%9C-%EC%9A%94%EC%86%8C%EC%A0%91%EA%B7%BC


let loading = document.querySelector(".loading"); // 1-5 : 로딩은 1개라 querySelector
let rotate = document.querySelectorAll('.rotate'); // 1-9 : 전체 로테이트 가져와야해서 querySelectorAll
let opacity = document.querySelectorAll('.opacity'); // 1-9

setTimeout(() => loading.classList.add("scene1"), 0), // 1-5 -> 쉼표(,)와 세미콜론(;)주의
setTimeout(() => loading.classList.add("scene2"), 1500), // 1-5
setTimeout(() => loading.classList.remove("scene1" , "scene2"), 2500), // 1-5 -> .loading 만 먼저 작성할때는 세미콜론(;)으로 여기까지 작성 후 결과 확인
//css로 이동해서 1-6작성


setTimeout(() => rotate.forEach(rotate => { rotate.classList.add('on') }), 2500), // 1-9
setTimeout(() => opacity.forEach(opacity => { opacity.classList.add('on') }), 2500);  // 1-9

// 1-10. 다 작성하고 결과 확인 후 이후 작업 내내 새로고침하면 로딩페이지 뜨니까 스크립트 전체 주석 처리하고 [ 스크립트 2 ] 번 이어서 작성


// [ 스크립트 2 - 스크롤트리거 애니메이션 시작 ]
// 2-1. 스크롤트리거_설명.txt 파일 참고해서 html 에  gsap 과 ScrollTrigger 경로 걸어주고 작성 시작 
// 2-2. gsap 라이브러리에 ScrollTrigger 플러그인 등록 먼저 해준다    
gsap.registerPlugin(ScrollTrigger);


// [ 스크립트 3 - visual 의 로고 스크롤트리거 애니메이션 ]    
// start / end 타이밍 맞춘 기준 : 비주얼이 나오자마자 화면의 맨밑인 100% 부터 화면의 맨위인 0% 까지 갈때까지 SVG들이 움직임
// timeline 참고 url -> https://greensock.com/docs/v3/GSAP/gsap.timeline()
gsap.timeline({
    scrollTrigger: {
        trigger: '.visual', // 트리거 대상
        start: '100% 100%',  // 앞 -> 트리거 대상의 시작지점 (start) / 뒤 -> 시작 지점 scroller-start 이 두개가 만났을때 애니 시작(100% 말고 bottom 이라고 써도됨)
        end: '100% 0%', // 앞 -> 트리거 대상의 종료지점 (end) / 뒤에 -> 종료 지점 scroller-end 이 두개가 만났을때 애니 종료 (0% 말고 top 이라고 써도됨)
        scrub: 1, // scrub은 ScrollTrigger의 이벤트가 스크롤이 사용될때만 재생되도록 만들어주는 속성 (안적으면 트리거시점 나오면 스크롤안해도 계속 애니 진행됨)
                  // scrub은 true 나 숫자로 값을 써줄수있는데 true 같은 경우는 스크롤하면 애니 바로 멈추고 숫자는 그 사점을 따라잡는데 N초가 걸려서 애니가 더 부드러움
        //markers: true
    }
})
// gsap.to() 메서드는 움직임의 끝나는 점을 지정하는 애니메이션 -> gsap.to("타겟", {속성: 속성값, ....});
// to 참고 url -> https://greensock.com/docs/v3/GSAP/gsap.to()
.to('.logoWrap #j',{x: '-150',y:'250',rotate:'20', ease: 'none',duration: 5,},0) // ,0 = 0 초 뒤에 바로시작하라는 의미 = ,0 을 다 빼보면 동시에 시작 안함
.to('.logoWrap #y',{x: '-30',y:'150',rotate:'-10', ease: 'none',duration: 5,},0)
.to('.logoWrap #o',{x: '0', y:'400',rotate:'-10', ease: 'none',duration: 5,},0)
.to('.logoWrap #u',{x: '50', y:'300',rotate:'10', ease: 'none',duration: 5,},0) 
.to('.logoWrap #n',{x: '100',y:'100',rotate:'-10', ease: 'none',duration: 5,},0) 
.to('.logoWrap #g',{x: '50',y:'450',rotate:'0', ease: 'none',duration: 5,},0) 
// 여기까지 작성하면 자연스럽게 밑에 푸터에 svg도 애니가 먹힌다 (비주얼 svg가 푸터까지 따라 내려온 느낌으로 표현할 예정)

    
// [ 스크립트 4 - 전체 mainTextBox 스크롤트리거 애니메이션 ]    
gsap.utils.toArray(".mainTextBox .title i").forEach((selector) => {// 대상을 'selector'에 저장하고 forEach로 함수를 작성을해야 각각 타임라인이 적용된다 -> 아니면 한번에 애니메이션이 들어가 버림      
    gsap.timeline({
        scrollTrigger: {
            trigger: selector,
            start: '100% 100%', 
            end: '100% 100%', // SVG애니 타이밍과 거의 동일 하지만 종료 지점(scroller-end) 을 100%로 옮겨서 시작과 동시에 끝이 빠르게 진행되도록 해준다
            scrub: 1,
            //markers: true,
        }
    })
    // gsap.fromTo() 메서드는 시작 점과 끝나는 점을 지정하는 애니메이션 -> gsap.fromTo("타겟", {시작 속성: 시작 속성값, ....},{끝나는 속성: 끝나는 속성값, ....});
    // fromTo 참고 url -> https://greensock.com/docs/v3/GSAP/gsap.fromTo()
    .fromTo(selector,{'overflow': 'hidden', y:'150'}, { y:'0',ease: 'none',duration: 5},0)
});   

        
// [ 스크립트 5 - 전체 subText 스크롤트리거 애니메이션 ]   
// 스크립트 4번 복사해서 클래스명이랑 fromTo 애니메이션 부분만 오퍼시티 느낌으로 바꿔줌
gsap.utils.toArray(".subText p").forEach((selector) => {      
    gsap.timeline({
        scrollTrigger: {
            trigger: selector,
            start: '100% 100%', 
            end: '100% 100%',
            scrub: 1,
            //markers: true,
        }
    })
    .fromTo(selector,{opacity: '0', y:'100'}, {opacity: '1', y:'0',ease: 'none',duration: 5},0)
}); 

// [ 스크립트 6 - con1 의 textAni 텍스트 체인지 gsap(쥐삽) 애니메이션 ]       
let textAniList = document.querySelectorAll(".con1 .textAni li");
let textAni = new gsap.timeline({ repeat: -1 });

for (let i = 0; i < textAniList.length; i++) { // index를 지정하는 전통적인 for문 (그냥 외우도록)
                                               // for 반복문에서 index 활용 참고 url -> https://learnjs.vlpt.us/basics/08-loop.html
	textAni.to(textAniList[i], 0.8, { opacity: 1, repeat: 1, delay: 0, x: 0,  yoyo: true , ease: "power4.out"});
    // ease 타이밍 참고 url -> https://greensock.com/docs/v3/Eases
}
textAni.play();    
  

// [ 스크립트 7 - con3 의 listBox 카드 날라오는 스크롤트리거 애니메이션 ]   
gsap.utils.toArray(".con3 .listBox li").forEach((selector, t) => { 
    // create 참고 ->https://greensock.com/docs/v3/Plugins/ScrollTrigger/static.create()
    ScrollTrigger.create({
        trigger: selector,
        start: "start 100%",
        onEnter: ()=>{ // onEnter - 스크롤 위치가 "시작"을 지나 앞으로 이동할 때 (시작 지점을 지나 스크롤 내릴때 진행되고 올릴땐 진행되지 않음)
            gsap.set(selector, { // https://greensock.com/docs/v3/GSAP/gsap.set()
                rotationX: "-65deg",
                z: "-500px",
                opacity: 0
            }),
            gsap.to(selector, {
                rotationX: "0",
                z: "0",
                opacity: 1,
                delay: t % 3 * .05
            })
        },
        //markers: true,
    })
}); 

// [ 스크립트 8 - con4 의 listBox 스크롤트리거 애니메이션 ]   
gsap.utils.toArray(".con4 .listBox .box").forEach((selector) => {
    gsap.timeline({
        scrollTrigger: {
            trigger: selector,
            start: '0% 20%', 
            end: '0% 0%', 
            scrub: 1,
           //markers: true,
        }
    })
     .to(selector,{transform: 'rotateX(-10deg) scale(0.9)', transformOrigin:"top", filter: 'brightness(0.3)'},0)   
});     
         

// [ 스크립트 8 - con5 의 listBox 마우스 오버 애니메이션 ]
let listBox = document.querySelectorAll(".con5 .listBox li");   
let imgBox = document.querySelector(".con5 .imgBox");
let img = document.querySelector(".con5 .imgBox img");
//let wrap = document.querySelector(".wrap");


for (let i = 0; i < listBox.length; i++) {
    
	listBox[i].addEventListener("mouseover",() => {  // 마우스 오버 하면
        img.src = `images/img${i}.jpg`;
       gsap.set(imgBox, { scale: 0, opacity: 0,  duration: .3 }), // 마우스 오버할때마다 작아졌다 커지기 위해서 한번더 스케일 0 과 오퍼시티 0 해준다
        gsap.to(imgBox, { scale: 1, opacity: 1, duration: .3 })
	})
    listBox[i].addEventListener("mousemove",(e) => { // 마우스 무브 하면
        var imgBoxX = e.pageX + 20; // 브라우저 페이지 전체의 x좌표 위치를 반환 + 20 한 값을 -> imgBoxX 에 저장
        var imgBoxY = e.pageY - 20; // 브라우저 페이지 전체의 Y좌표 위치를 반환 - 20 한 값을 -> imgBoxY 에 저장
		imgBox.style.left = imgBoxX + 'px';
		imgBox.style.top = imgBoxY + 'px';
        //page 메서드는 문서가 기준이다 client와 비슷하지만 이 메서드는 문서 전체 크기가 기준이라 스크롤 시 값이 바뀐다 (스크롤을 포함해서 측정).
        //page 메서드 참고 url -> https://mong-blog.tistory.com/entry/clientX-offsetX-pageX-screenX-%EC%B0%A8%EC%9D%B4
	})
    listBox[i].addEventListener("mouseout",() => { // 마우스 아웃 하면
        gsap.to(imgBox, { scale: 0, opacity: 0, duration: .3})
	})
}   

// 마우스 오버하면 나오는 이미지들 때문에 모서리 쪽으로 가면 가로스크롤이 생긴다  
// pageX , pageY는 포지션이 문서 전체 기준으로 하기 때문에 .con5 에 기준으로 하는 position: relative 를 주지 않았다 
// 그래서 결론적으로 .con5 에 오버플로우 히든을 해도 가려질수없어서 스크롤이 생기게 된다
// wrap에 오버플로우 히든을 하면 가려지지만 위에 position: sticky 속성 활용한것들이 많아서 직접 css 작성은 못하고
// 스크롤 트리거를 활용해서 .con5가 보일때만 wrap class 'on' 을 추가해 오버플로우를 해줄것임 (css 209번 줄 가서 작성) 
gsap.timeline({
    scrollTrigger: {
        trigger: '.con5, .con3',
        start: '0% 100%',  // con5이 화면의 끝부터 올라오자 마자 화면의 맨위로 사라질때 까지 진행
        end: '100% 0%',
        toggleClass: {targets: '.wrap', className: "on"},
        //markers: true
    } // 스크롤 해보면서 wrap 에 on 클래스가 붙고 떼지는지 체크
})
   

// [ 스크립트 9 - footer 의 로고 스크롤트리거 애니메이션 ]  
// 이미 스크립트 3번에서 .logoWrap 에 준 스크롤 트리거와 동일하게 먹혀서 로고가 흐트러진 상태이다 거기에서 위에서 이어져서 내려오는 느낌 추가를 위해 스크립트 작성 */    
gsap.timeline({
    scrollTrigger: {
        trigger: 'footer', // 트리거 대상
        start: '0% 100%',  // footer 가 화면의 끝에서 올라오자 마자 화면의 끝에 도착할때까지 애니 진행
        end: '100% 0%',
        scrub: 1,   
        //markers: true
    }
})
.to('.logoWrap',{top:'20%', ease: 'none',duration: 5,},0) // 마치 visual의 도형들이 위에서 내려오는 느낌으로

    
// [ 스크립트 10 - gnb 애니메이션 ] 
let menuOpen = document.querySelector(".gnb .menuOpen");   
let menuBox = document.querySelector(".gnb .menuBox");
    
menuOpen.addEventListener("click",() => { 
        menuBox.classList.toggle("on"); // css 가서 on 클래스 작성
})

    
} // 스크립트 끝







