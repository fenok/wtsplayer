document.cancelFullScreen = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen;

// Note: FF nightly needs about:config full-screen-api.enabled set to true.
function enterFullscreen(id)
{
  var el = document.getElementById(id);
  if (el.webkitRequestFullScreen)
  {
    el.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
  }
  else
  {
    el.mozRequestFullScreen();
  }
}

function exitFullscreen()
{
  document.cancelFullScreen();
}

$(document).ready(function()
{
	$("#fullscreen").on('click', function()
	{
		enterFullscreen("screenWrapper");
	})
});

var docWidth, docHeight, docRatio, div = document.getElementsByTagName('div')[0];

onresize = function()
{
    docWidth = document.documentElement.clientWidth;
    docHeight = document.documentElement.clientHeight;
    // ширина и высота вьюпорта

    docRatio = docWidth / docHeight;
    // соотношение сторон вьюпорта

    fullScreenProportionalElem(div, 1920, 1080); // элемент, ширина, высота
    resizeFont(div, 1920, 1080, 200); // элемент, ширина, высота, размер шрифта
    // размер шрифта зависит от выставленной ширины и высоты
}

function fullScreenProportionalElem(elem, width, height)
{
    var ratio = width / height;
    // соотношение сторон элемента

    if (docRatio < ratio)
    {
        elem.style.width = docWidth + 'px';
        elem.style.height = Math.round(docWidth / ratio) + 'px';
        elem.style.top = Math.round(docHeight / 2 - elem.offsetHeight / 2) + 'px';
        elem.style.left = '0px';
        // высота вьюпорта больше чем высота элемента
        // ширину элемента приравниваем к ширине вьюпорта, высоту вычисляем
        // центрируем элемент по высоте
    }
    else if (docRatio > ratio)
    {
        elem.style.width = Math.round(docHeight * ratio) + 'px';
        elem.style.height = docHeight + 'px';
        elem.style.top = '0px';
        elem.style.left = Math.round(docWidth / 2 - elem.offsetWidth / 2) + 'px';
        // ширина вьюпорта больше чем ширина элемента
        // высоту элемента приравниваем к высоте вьюпорта, ширину вычисляем
        // центрируем элемент по ширине
    }
    else
    {
        elem.style.width = docWidth + 'px';
        elem.style.height = docHeight + 'px';
        elem.style.top = '0px';
        elem.style.left = '0px';
        // соотношение сторон вьюпорта равно соотношению сторон элемента
        // приравниваем стороны элемента к сторонам вьюпорта
        // обнуляем значения top и left
    }
}

function resizeFont(elem, width, height, size)
{
    var ratio = width / height;
    // соотношение сторон элемента
    
    if (docRatio < ratio) elem.style.fontSize = height * size / 14062 + 'vw';
    else if (docRatio > ratio) elem.style.fontSize = width * size / 14062 + 'vh';
    // число 14062 можно менять и подстраивать под себя, будет меняться размер шрифта
}

onresize();
// вызываем функцию