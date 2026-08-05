//01.a속성 위로 튕기는 현상 제거
$(document).on('click', 'a[href="#"]', function(e) {
    e.preventDefault();
})

//gnb메뉴
$(function(){
    $('header .inner .gnbBtn').on('click', function(){
        $('nav.gnb').toggleClass('on');
    })
    $('.contents').on('click', function(){
        $('nav.gnb').removeClass('on');
    })
});

$(window).on('scroll resize', function(){
    let scrollPos = 0;
        scrollPos = $(document).scrollTop();

        fix();
        fixHeader();
        fixList();

        function fixHeader() {
        if(scrollPos > 80) {$('header').addClass('on');}
        else{$('header').removeClass('on')}
        }

        function fix(){
            if(scrollPos > 1250){$('.fix .text').addClass('on')}
            else{$('.fix .text').removeClass('on');}
            if(scrollPos > 2700){$('.fix .text').removeClass('on');}
        }
        function fixList(){
            if(scrollPos > 1250){
                $('.approach .inner .list li a').removeClass('on');
                $('.approach .inner .list li:eq(0) a').addClass('on');
            }
            if(scrollPos > 1650){
                $('.approach .inner .list li a').removeClass('on');
                $('.approach .inner .list li:eq(1) a').addClass('on');
            }
            if(scrollPos > 2050){
                $('.approach .inner .list li a').removeClass('on');
                $('.approach .inner .list li:eq(2) a').addClass('on');
            }
            if(scrollPos > 2550){
                $('.approach .inner .list li a').removeClass('on');
                $('.approach .inner .list li:eq(3) a').addClass('on');
            }


        }

})