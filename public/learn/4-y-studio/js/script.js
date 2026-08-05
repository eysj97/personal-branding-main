//a의 기본속성(클릭시 위로 튕김 현상 제거)
document.addEventListener('click', function(e){
    if(e.target.closest('a[href="#"]')){
        e.preventDefault();
    }
});

$(function(){
    $('.visual .slide').slick({
        arrows: true,  //화살표
        dots: false, //인디케이트 해제
        fade: true,//페이드효과
        autoplay:true, //자동재생
        autoplaySpeed: 4000, //재생시간
        pauseOnHover: false,
        pauseOnFocus: false   
    });
});

/*
// fixHeader이벤트
var scrollTop = 0;
// console.log(scrollTop);
scrollTop = $(document).scrollTop();
fixHeader();

$(window).on('scroll resize', function(){
    scrollTop = $(document).scrollTop();
    fixHeader();
})

function fixHeader( ){
    if(scrollTop > 150) {
        $('header').addClass('on');
    }else{
            $('header').removeClass('on');
        }
    
}
*/

// --- Vanilla JS로 변환된 코드 ---

// 현재 스크롤 위치를 저장할 변수를 초기화합니다.
let scrollTop = 0;

// 페이지가 로드될 때 현재 스크롤 위치를 가져와서 초기화합니다.
// window.scrollY는 문서가 수직으로 얼마나 스크롤되었는지를 픽셀 단위로 반환합니다.
// (호환성을 위해 document.documentElement.scrollTop를 함께 사용할 수 있습니다.)
scrollTop = window.scrollY;
fixHeader();

// window 객체에 'scroll' 이벤트 리스너를 등록합니다.
// 사용자가 마우스 휠이나 터치로 스크롤을 움직일 때마다 발생합니다.
window.addEventListener('scroll', function(){
    scrollTop = window.scrollY; // 갱신된 스크롤 위치를 변수에 다시 할당
    fixHeader(); // 위치에 맞춰 헤더 상태 변경
});

// window 객체에 'resize' 이벤트 리스너를 등록합니다.
// 창 크기를 조절할 때마다 발생하며, 레이아웃 변경에 대비해 스크롤 위치를 다시 계산합니다.
window.addEventListener('resize', function(){
    scrollTop = window.scrollY;
    fixHeader();
});

// 스크롤 위치에 따라 header 요소에 'on' 클래스를 추가하거나 제거하는 함수입니다.
function fixHeader() {
    // 문서 내에서 첫 번째 <header> 요소를 찾아 변수에 저장합니다.
    const header = document.querySelector('header');
    
    // header 요소가 제대로 존재하는지 검사하여 에러를 방지합니다.
    if(header) {
        // 스크롤 위치가 150px보다 아래에 있는 경우
        if(scrollTop > 150) {
            // header 요소의 클래스 목록(classList)에 'on' 클래스를 추가합니다.
            header.classList.add('on');
        } else {
            // 스크롤 위치가 150px 이하인 경우(상단으로 올라온 경우) 'on' 클래스를 제거합니다.
            header.classList.remove('on');
        }
    }
}

/*
//gnbMenu
$(function(){
    $('.menuOpen').on('click', function(){
        $('.gnb').addClass('on');
    });
    $('.close').on('click', function(){
        $('.gnb').removeClass('on');
    })
});
*/

// --- Vanilla JS로 변환된 코드 ---

// DOMContentLoaded는 HTML 문서가 완전히 로드되고 파싱되었을 때 실행되는 이벤트입니다.
// 제이쿼리의 $(function(){ ... }) 또는 $(document).ready(...) 와 동일한 역할을 합니다.
document.addEventListener('DOMContentLoaded', function() {
    
    // '.menuOpen' 클래스를 가진 요소(메뉴 열기 버튼)를 찾아 변수에 저장합니다.
    const menuOpenBtn = document.querySelector('.menuOpen');
    
    // '.close' 클래스를 가진 요소(메뉴 닫기 버튼)를 찾아 변수에 저장합니다.
    const closeBtn = document.querySelector('.close');
    
    // '.gnb' 클래스를 가진 요소(내비게이션 메뉴 영역)를 찾아 변수에 저장합니다.
    const gnbMenu = document.querySelector('.gnb');

    // 메뉴 열기 버튼이 실제로 문서에 존재하는지 검사하여 에러를 방지합니다.
    if (menuOpenBtn) {
        // 메뉴 열기 버튼에 'click' 이벤트 리스너를 추가합니다.
        menuOpenBtn.addEventListener('click', function() {
            // 클릭 시 내비게이션 메뉴 영역에 'on' 클래스를 추가하여 메뉴가 화면에 나타나게 합니다.
            if (gnbMenu) gnbMenu.classList.add('on');
        });
    }

    // 메뉴 닫기 버튼이 실제로 문서에 존재하는지 검사합니다.
    if (closeBtn) {
        // 닫기 버튼에 'click' 이벤트 리스너를 추가합니다.
        closeBtn.addEventListener('click', function() {
            // 클릭 시 내비게이션 메뉴 영역에서 'on' 클래스를 제거하여 메뉴를 다시 숨깁니다.
            if (gnbMenu) gnbMenu.classList.remove('on');
        });
    }
});

// top버튼 상단으로 부드럽게 이동
$(function(){
    $('.goTop').on('click', function(){
        const top = $('body').offset().top;
        //offset()함수는 원하는 선택자의 위치값을 .top, .lef을 반환하는 함수
        $('html, body').animate({scrollTop : (top)},800)
    })
})