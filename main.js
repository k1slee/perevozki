document.addEventListener('DOMContentLoaded',function(){
  var themeBtns=document.querySelectorAll('.theme-btn')
  function setActive(name){
    themeBtns.forEach(function(b){b.classList.toggle('active',b.dataset.theme===name)})
  }
  function applyTheme(name){
    if(name==='light'){document.documentElement.removeAttribute('data-theme')}
    else{document.documentElement.setAttribute('data-theme',name)}
    localStorage.setItem('theme',name)
    setActive(name)
  }
  if(themeBtns.length){
    var saved=localStorage.getItem('theme')||'light'
    if(saved!=='festive') saved='light'
    applyTheme(saved)
    themeBtns.forEach(function(btn){
      btn.addEventListener('click',function(){applyTheme(btn.dataset.theme)})
    })
  }
  var toggle=document.querySelector('.nav-toggle')
  var menu=document.getElementById('nav-menu')
  if(toggle&&menu){
    toggle.addEventListener('click',function(){
      var opened=menu.classList.toggle('open')
      toggle.setAttribute('aria-expanded',String(opened))
    })
  }
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id=a.getAttribute('href').slice(1)
      var el=document.getElementById(id)
      if(el){
        e.preventDefault()
        window.scrollTo({top:el.offsetTop-64,behavior:'smooth'})
        if(menu&&menu.classList.contains('open')) menu.classList.remove('open')
      }
    })
  })
  var calcBtn=document.getElementById('calc-btn')
  var result=document.getElementById('calc-result')
  function round(n){return Math.round(n*100)/100}
  function calcPrice(hours,cls){
    var rate={sedan:35,minivan:45,minibus:55}[cls]||35
    var minHours={sedan:3,minivan:3,minibus:4}[cls]||3
    var h=Math.max(hours,minHours)
    return round(h*rate)
  }
  if(calcBtn&&result){
    calcBtn.addEventListener('click',function(){
      var form=document.getElementById('quick-order')
      var hours=parseFloat(form.hours.value||'0')
      var cls=form.class.value
      if(isNaN(hours)||hours<=0){result.textContent='Введите часы аренды';return}
      var price=calcPrice(hours,cls)
      result.textContent=price+' BYN'
    })
  }
  var order=document.getElementById('quick-order')
  if(order){
    order.addEventListener('submit',function(e){
      e.preventDefault()
      var data=new FormData(order)
      var text='Заявка (свадьба): '+(data.get('from')||'')+' → '+(data.get('to')||'')+
        ', дата: '+(data.get('datetime')||'')+
        ', пассажиров: '+(data.get('passengers')||'1')+
        ', класс: '+(data.get('class')||'sedan')+
        ', часы: '+(data.get('hours')||'') 
      var phone='+375291234567'
      var link='https://wa.me/'+phone.replace(/\D/g,'')+'?text='+encodeURIComponent(text)
      window.open(link,'_blank','noopener')
    })
  }
  var contact=document.getElementById('contact-form')
  if(contact){
    contact.addEventListener('submit',function(e){
      e.preventDefault()
      var d=new FormData(contact)
      var text='Вопрос от '+(d.get('name')||'без имени')+
        ', телефон: '+(d.get('phone')||'')+
        '. '+(d.get('message')||'')
      var phone='+375291234567'
      var link='https://wa.me/'+phone.replace(/\D/g,'')+'?text='+encodeURIComponent(text)
      window.open(link,'_blank','noopener')
    })
  }
  ;(function(){
    var lb=document.getElementById('lightbox'); if(!lb) return
    var lbImg=lb.querySelector('.lightbox-img');
    var closeBtn=lb.querySelector('.lightbox-close');
    var prevBtn=lb.querySelector('.lightbox-prev');
    var nextBtn=lb.querySelector('.lightbox-next');
    var state={list:[], current:-1}
    function openAt(i){ if(i<0||i>=state.list.length) return; state.current=i; lbImg.src=state.list[i].src; lb.classList.add('open'); lb.setAttribute('aria-hidden','false'); }
    function close(){ lb.classList.remove('open'); lb.setAttribute('aria-hidden','true'); }
    function show(d){ if(!state.list.length) return; state.current=(state.current+d+state.list.length)%state.list.length; lbImg.src=state.list[state.current].src; }
    function bind(){
      var imgs=[].slice.call(document.querySelectorAll('.gallery-item img'));
      imgs.forEach(function(img){
        var src=img.getAttribute('data-src'); if(src && !img.src) img.src=src;
        if(!img.dataset.lbBound){
          img.dataset.lbBound='1'
          img.addEventListener('load',function(){
            var p=img.closest('.gallery-item'); if(p){ p.classList.add('loaded'); }
          });
          img.addEventListener('error',function(){
            var p=img.closest('.gallery-item'); if(p){ p.style.display='none'; }
          });
          img.addEventListener('click',function(){
            var list=[].slice.call(document.querySelectorAll('.gallery-item img')).filter(function(x){return x.src})
            state.list=list
            var idx=list.indexOf(img)
            if(idx>=0) openAt(idx)
          })
        }
      })
      state.list=[].slice.call(document.querySelectorAll('.gallery-item img')).filter(function(x){return x.src})
    }
    bind()
    document.addEventListener('gallery:updated',bind)
    if(closeBtn) closeBtn.addEventListener('click',close);
    if(prevBtn) prevBtn.addEventListener('click',function(){ show(-1); });
    if(nextBtn) nextBtn.addEventListener('click',function(){ show(1); });
    lb.addEventListener('click',function(e){ if(e.target===lb) close(); });
    document.addEventListener('keydown',function(e){
      if(!lb.classList.contains('open')) return;
      if(e.key==='Escape') close();
      if(e.key==='ArrowRight') show(1);
      if(e.key==='ArrowLeft') show(-1);
    });
  })()
})
