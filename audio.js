/*
Inspirado e em parte copiado de: https://github.com/mdn/voice-change-o-matic/blob/gh-pages/scripts/app.js 

As grandes alterações foram: 
* Remoção de diversos filtros e 
* Implementação do algoritmo para detecção do ataque utilizando médias exponenciais
*/

//document.body.addEventListener('click', initAudio);


function initAudio() {
  
  //document.body.removeEventListener('click', initAudio)

  // Older browsers might not implement mediaDevices at all, so we set an empty object first
  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }


  // Some browsers partially implement mediaDevices. We can't just assign an object
  // with getUserMedia as it would overwrite existing properties.
  // Here, we will just add the getUserMedia property if it's missing.
  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function(constraints) {

      // First get ahold of the legacy getUserMedia, if present
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

      // Some browsers just don't implement it - return a rejected promise with an error
      // to keep a consistent interface
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }

      // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
      return new Promise(function(resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
  }



  // set up forked web audio context, for multiple browsers
  // window. is needed otherwise Safari explodes

  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var source;
  var stream;

  //set up the different audio nodes we will use for the app

  var analyser = audioCtx.createAnalyser();
  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.85;
  

  var gainNode = audioCtx.createGain();

  // set up canvas context for visualizer

  var canvas = document.querySelector('.visualizer');
  var canvasCtx = canvas.getContext("2d");

  var intendedWidth = document.querySelector('.wrapper').clientWidth;

  canvas.setAttribute('width', intendedWidth);

  //main block for doing the audio recording

  if (navigator.mediaDevices.getUserMedia) {
    console.log('getUserMedia supported.');
    var constraints = {audio: true}
    navigator.mediaDevices.getUserMedia (constraints)
      .then(function(stream) {
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(gainNode);
        gainNode.connect(analyser);
        // echo audio
        //analyser.connect(audioCtx.destination);
        visualize();
      }).catch( function(err) { console.log('The following gUM error occured: ' + err);})
  } else {
    console.log('getUserMedia not supported on your browser!');
  }

  function visualize() {
    var WIDTH = canvas.width;
    var HEIGHT = canvas.height;

    analyser.fftSize = 512;
    var bufferLengthAlt = analyser.frequencyBinCount;
    
    var dataArrayAlt = new Uint8Array(bufferLengthAlt);
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    // exponential averages uset to detect atack
    // fast
    var fea = 0
    // slow
    var sea = 0
    var atack = false
    var startAtack = false

    var drawAlt = function() {
      drawVisual = requestAnimationFrame(drawAlt);

      analyser.getByteFrequencyData(dataArrayAlt);

      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

      var barWidth = (WIDTH / bufferLengthAlt) * 2.5;
      var barHeight;
      var x = 0;


      const sliceN = 100
      var dataArrayAlt2 = Array.from(dataArrayAlt).slice(0, sliceN)
      
      var lags = dataArrayAlt2.reduce((a, c, i, l) => {
        //a.push(c)


        for (var j = 0; j < 50; j++) {
          if (i > j) a.push(Math.sqrt(Math.pow(c - l[i - j], 2)))
        }

        //if (i) {
        //  a.push(Math.abs(c - l[i-1]))
        //}
        
        return a
      }, dataArrayAlt2)

      //lags = lags.sort((a, b) => a-b)
      // compute exponential average
      fea = fea * (1 - 0.7) + dataArrayAlt.reduce((a, c) => a + c, 0)/sliceN * 0.7
      sea = sea * (1 - 0.3) + dataArrayAlt.reduce((a, c) => a + c, 0)/sliceN * 0.3
      
      // threshold 
      if (fea > parseFloat(app.$data.audioThreshold)) {

        if (fea > sea) {
          if (!startAtack) {
            //console.log('enable...')
          }
          startAtack = true
        }
        
        // normalize
        const lagMax = Math.max.apply(0, lags)
        lags = lags.map(item => item/lagMax)

        if (fea < sea && startAtack) {
          atack = true
          //console.log('atack!')
          
          let loadOn = app.$data.loadOn
          
          if (loadOn) {
            DATA.val.push([loadOn, lags])

            console.log(loadOn)
          } else {
            // Se tem dados treinados, inferir no modelo
            if (window.MODEL) {
              //BINDEX.val = window.B(dataArrayAlt)
              BINDEX.val = predictBayes(lags, window.MODEL)
              
            }
          }
          startAtack = false
        }
      }

      // plot
      for(var i = 0; i < bufferLengthAlt; i++) {
        barHeight = dataArrayAlt[i];

        if (fea > sea && startAtack) {
          canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
        } else {
          canvasCtx.fillStyle = 'rgb(50,50,' + (barHeight+100) + ')';
        }
        canvasCtx.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight/2);

        x += barWidth + 1;
      }


    };

    drawAlt();
  }
}