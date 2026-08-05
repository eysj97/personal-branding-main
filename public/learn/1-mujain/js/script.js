// 스크립트 위로 튕기는것
$(document).on('click', 'a[href="#"]', function(e){
    e.preventDefault()
})
// svg path길이 구하기
$(function(){
    $('.svgAni').find('path').each(function(i,path){
        var totalLength = path.getTotalLength();
    });
});
// 햄버거 메뉴
$(function(){
    $('.menuOpen button.open').on('click', function(){
        $('.menuOpen .menuWrap').addClass('on');
    })
    $('.menuOpen .menuWrap .close').on('click', function(){
        $('.menuOpen .menuWrap').removeClass('on');
    });
});

// 스크롤라
$(function(){
    $('.animate').scrolla({
        mobile: true, //모바일버전시 활성화
        once: false //스크롤 시 딱 한번만 하고 싶을땐 true
    });
});

// 배경색 변경 애니메이션
$(window).on('scroll resize', function(){
    let scrollTop = $(document).scrollTop();
    bgColor();

    function bgColor(){
        if(scrollTop > 1400) {
            $('body').addClass('on');
        }else {
            $('body').removeClass('on');
        }
        if(scrollTop > 2700){
            $('body').removeClass('on');
        }
    }
})

