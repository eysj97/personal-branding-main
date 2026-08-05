$(document).on('click', 'a[href="#"]', function(e){
    e.preventDefault();
});
//preventDefault 는 기본으로 정의된 이벤트를 작동하지 못하게 하는 메서드입니다


//slick
  $(function(){
     $('.visual .slide').slick({
        arrows: true,  //화살표
        dots: true, //인디케이트 해제
        fade: true,//페이드효과
        autoplay:true, //자동재생
        autoplaySpeed: 7000, //재생시간
        pauseOnHover: false,
        pauseOnFocus: false   
    });
    $('.slick-prev').text("prev");

//두번째 슬라이드
$(".slide2").slick({
        arrows:false,//화살표
        dots:true,//인디케이터
        autoplay:true, //자동재생
        infinite:true,
        slidesToShow:2,
        slidesToScroll:1,
        autoplaySpeed:6000,//재생시간
        pauseOnHover:true, //호버시 멈추는 멈추도록 설정함
        pauseOnFocus:true
});
$('.slide2 #slick-slide-control10').text("서울 마곡지구 업무용지");
$('.slide2 #slick-slide-control11').text("서울 마곡지구 대방디엠시티2치");
$('.slide2 #slick-slide-control12').text("화성 동탄1차 대방디엠시티 더 센텀");
$('.slide2 #slick-slide-control13').text("광주 수완 대방노블랜드6차");

});

//gnb
$(function(){
    $('.gnb > li > a').on('mouseenter focus', function(){
        var gnbindex = $('.gnb > li > a').index($(this));
        //alert(gnbindex );
        $('.gnb li ul.inner').removeClass('on');
        $('.gnb li ul.inner:eq('+ gnbindex  +')').addClass('on');
    });
    $('header').on('mouseleave', function(){
          $('.gnb li ul.inner').removeClass('on');
    })
});

//fixHeader

var scrollFix = 0;
scrollFix = $(document).scrollTop();
fixHeader();

$(window).on('scroll resize', function(){
  scrollFix = $(document).scrollTop();
  fixHeader();
})

function fixHeader() {
    if(scrollFix  > 150) {
        $('header').addClass('on');
    } else {
        $('header').removeClass('on');
    }
}

//스크롤애니메이션(scrolla.js)
$(function() {
	$('.animate').scrolla({
		mobile: true, //모바일버전시 활성화
		once: false //스크롤시 딱 한번만 하고싶을땐 true
	});    
}); 



//글자애니메이션  Splitting 데모사이트 그대로 작성 따라하기
$(function(){
    Splitting();
});


//video
$(function(){
    $('.videoBox .mask').on('click' , function(){
        $(this).css({'display':'none'});
        $('.videoBox iframe').css({'display':'block'});
    })
});