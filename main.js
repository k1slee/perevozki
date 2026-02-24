document.addEventListener('DOMContentLoaded',function(){
  var themeBtns=document.querySelectorAll('.theme-btn')
  function setActive(name){
    themeBtns.forEach(function(b){b.classList.toggle('active',b.dataset.theme===name)})
  }
  function applyTheme(name){
    if(name==='neon'){document.documentElement.removeAttribute('data-theme')}
    else{document.documentElement.setAttribute('data-theme',name)}
    localStorage.setItem('theme',name)
    setActive(name)
  }
  if(themeBtns.length){
    var saved=localStorage.getItem('theme')||'neon'
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
  function calcPrice(km,cls){
    var base={sedan:0.6,minivan:0.75,minibus:0.95}[cls]||0.6
    var min={sedan:25,minivan:30,minibus:40}[cls]||25
    var price=km*base
    if(price<min) price=min
    return round(price)
  }
  if(calcBtn&&result){
    calcBtn.addEventListener('click',function(){
      var form=document.getElementById('quick-order')
      var km=parseFloat(form.distance.value||'0')
      var cls=form.class.value
      if(isNaN(km)||km<=0){result.textContent='Введите дистанцию';return}
      var price=calcPrice(km,cls)
      result.textContent=price+' BYN'
    })
  }
  var order=document.getElementById('quick-order')
  if(order){
    order.addEventListener('submit',function(e){
      e.preventDefault()
      var data=new FormData(order)
      var text='Заявка: '+(data.get('from')||'')+' → '+(data.get('to')||'')+
        ', дата: '+(data.get('datetime')||'')+
        ', пассажиров: '+(data.get('passengers')||'1')+
        ', класс: '+(data.get('class')||'sedan')+
        ', дистанция: '+(data.get('distance')||'')+' км'
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
})
