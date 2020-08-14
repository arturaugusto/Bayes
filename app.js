var DATA = {val: []};

var BINDEX = {val: undefined}
var MODEL = undefined

// função `histogram` roubada do jstat
// https://github.com/jstat
// adaptada para receber min e max
const histogram = function (arr, min, max, binCnt) {
  binCnt = binCnt || 4;
  var first = min;
  var binWidth = (max - first) / binCnt;
  var len = arr.length;
  var bins = [];
  var i;
  for (i = 0; i < binCnt; i++)
    bins[i] = 0;
  for (i = 0; i < len; i++)
    bins[Math.min(Math.floor((arr[i] - first) / binWidth), binCnt - 1)] += 1;
  return bins
}

var app = new Vue({
  el: '#app',
  data: {
    loadOn: undefined,
    newName: '',
    savedStates: window.DATA,
    trainedLabels: undefined,
    detectedIndex: BINDEX,
    selHistFeatureIndex: undefined,
    chart: undefined,
    type: undefined,// 'audio' 'table'
    txtData: undefined,
    dataIn: [],
    crossValidation: [],
    loss: undefined,
    audioThreshold: 140
  },
  watch: {
    type (val) {
      if (val === 'audio') {
        initAudio()
      }
    },
    selHistFeatureIndex () {
      this.updateChart()
    },
    txtData () {
      this.savedStates.val = this.parsedTxtData
      if (this.selHistFeatureIndex) {
        this.$nextTick(this.updateChart)
      }
    }
  },
  methods: {
    updateChart () {
      this.chart = this.chart || new Chart(this.$refs.hist.getContext('2d'), {
        type: 'bar',
        data: {
          datasets: undefined
        },
        options: {
          maintainAspectRatio: false,
          scales: {
            xAxes: [{
              stacked: true,
              display: false,
              barPercentage: 1.0,
              categoryPercentage: 1.0,
              gridLines: {
                //offsetGridLines: true
              }
            }, {
              display: true,
            }]
          },
          tooltips: {
            callbacks: {
              label: function(tooltipItem, data) {
                var label = data.datasets[tooltipItem.datasetIndex].label || '';

                if (label) {
                  label += ': ';
                }
                label += Math.round(tooltipItem.yLabel * 10000) / 10000;
                return label;
              }
            }
          }
        }
      });

      this.chart.canvas.parentNode.style.height = '300px';

      
      this.chart.data.labels = this.histograms[0].X
      this.chart.data.datasets = JSON.parse(JSON.stringify(this.histograms))
      
      this.chart.update()
    },
    removeAudioData (label) {
      let confirm = window.confirm('Remover item?')
      if (!confirm) return
      this.savedStates.val = this.savedStates.val.filter(item => item[0] !== label)
    },
    train () {
      this.trainedLabels = this.labels
      //console.log(this.tData)
      window.MODEL = fitBayes(this.tData)


      if (this.type === 'table') {



        this.$nextTick(this.updateChart)
        window.setTimeout(() => {
          this.selHistFeatureIndex = 0
        }, 100)

        
        // cross validation
        // faz apenas se tiver uma "quantidade razoável de dados"
        if (this.parsedTxtData.length < 20) {
          this.crossValidation = undefined
          return
        }

        let parsedData = this.parsedTxtData.slice(1)
        // shuffle data
        parsedData = parsedData.map(item => [Math.random(), item])
          .sort((a, b) => a[0] - b[0])
          .map(item => item[1])

        let chunkSize = Math.ceil(parsedData.length / 4)
        var chuks = []
        for (var i = 0; i < 4; i++) {
          chuks.push(parsedData.slice(i*chunkSize, (i+1)*chunkSize))
        }
        
        this.crossValidation = chuks.map((test, i) => {
          let trainChuks = chuks.filter((_, j) => i !== j).reduce((a, c) => a.concat(c), [])
          
          // TODO: Este código foi copiado do `tData`. Refatorar
          let trainData = this.labels.map(label => trainChuks.filter(row => row[0] === label && !!row[1]).map(row => row[1]))
          
          let model = fitBayes(trainData)

          let loss = test.map(item => {
            let res = predictBayes(item[1], model)
            return this.labels[res] === item[0] ? 0 : 1
          }).reduce((a, c) => a+c, 0)
          return [loss, test.length]

        })
      }

    },
    newLoad () {
      if (!this.newName.length) return
      this.savedStates.val.push([this.newName, undefined])
      console.log(this.savedStates.val)
      this.newName = ''
    },
    loadSampleTable () {
      this.txtData = `label;comprimento; doçura
maçã;5;6
maçã;4;3
maçã;5;4
maçã;5;2
maçã;5;6
maçã;3;3
maçã;3;1
maçã;3;2.3
maçã;3;5
maçã;5;6
maçã;3;3.6
maçã;4;3
maçã;4;3
maçã;4;2.5
maçã;5;4
banana;8;7
banana;5;6
banana;6;6
banana;8;7
banana;5;6
banana;13;6
banana;9;7
banana;8;5
banana;7;5
banana;10;7
banana;9;6
banana;8;6`

    }
  },
  computed: {
    resultInfer () {
      if (!this.dataIn.length) return
      if (this.dataIn.length !== this.features.length) return
      let dataInFloat = this.dataIn.map(item => parseFloat(item))

      
      for (var i = 0; i < dataInFloat.length; i++) {
        if(isNaN(dataInFloat[i])) return
      }

      let res = predictBayes(dataInFloat, window.MODEL)
      return this.trainedLabels[res]

    },
    tData () {
      //console.log(this.labels)
      //console.log(this.savedStates.val)
      return this.labels.map(label => this.savedStates.val.filter(row => row[0] === label && !!row[1]).map(row => row[1]))
    },
    splitedTxtData () {
      return (this.txtData || '')
        .split('\n') // separa nova linha
        .filter(item => !!item) // remove linha em branco
    },
    parsedTxtData () {
      return this.splitedTxtData
        .map((item, i) => item.split(/[\t;]+/) // separa por separador
        .map((x, j) => {
          if (i === 0) return x; // primeira linha é o node do feature
          if (j === 0) return x; // primeiro x é o label
          return !!x ? parseFloat(x) : 0; // converte para float ou zero
        })
      )
      .map(item => [item[0], item.slice(1)])
    },
    labels () {
      return this.savedStates.val.slice(this.type === 'table' ? 1 : 0).reduce((a, c) => {
        if (a.indexOf(c[0]) === -1) a.push(c[0])
        return a
      }, [])
    },
    detected () {
      if (!this.trainedLabels) return
      return this.trainedLabels[this.detectedIndex.val]
    },
    histograms () {
      let datasets = this.tData.map((klass, i) => {
        return Object({
          label: this.labels[i],
          data: klass.map((sample, j) => sample[parseInt(this.selHistFeatureIndex)])
        })
      })

      let datasets2 = datasets.map(dataset => {
        let min = Math.min.apply(0, dataset.data)
        let max = Math.max.apply(0, dataset.data)
        
        return Object({
          label: dataset.label,
          max: max,
          min: min,
          data: dataset.data
        })
      })

      console.log(this.splitedTxtData.length)
      const min = Math.min.apply(null, datasets2.map(item => item.min))
      const max = Math.max.apply(null, datasets2.map(item => item.max))
      // formula empirica para determinar quantidade de bins
      const nBins = Math.max.apply(null, [Math.min.apply(null, [(~~(this.splitedTxtData.length/4)), 20]), 4])
      const binWidth = (max - min) / nBins
      const X = []
      for (var i = 0; i <= nBins; i++) {
        X.push(parseFloat((min + (binWidth) * i).toFixed(3)))
      }

      

      const colors = [
        'rgba(76,114,176,0.6)',
        'rgba(221,132,82,0.6)',
        'rgba(85,168,104,0.6)',
        'rgba(196,78,82,0.6)',
        'rgba(129,114,179,0.6)',
        'rgba(147,120,96,0.6)',
        'rgba(218,139,195,0.6)',
        'rgba(140,140,140,0.6)',
        'rgba(204,185,116,0.6)',
        'rgba(100,181,205,0.6)'
      ]
      return datasets2.map((dataset, i) => {
        let data = histogram(dataset.data, min, max, nBins)
        let sum = data.reduce((a, c) => a+c , 0)

        return Object({
          label: dataset.label,
          backgroundColor: colors[i],
          //borderSkipped: 'left',
          data: data.map(item => item/sum),
          borderWidth: 1,

          X: X
        })
      })
        
    },
    features () {
      if (!this.tData || !this.tData.length || !this.tData[0].length) return
      return this.parsedTxtData[0][1]
    }
  },
  mounted () {
    document.getElementById('app').classList = ''
  }
})