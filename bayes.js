const bayes = function(groups) {

  // tamanho total dos dados
  const dataLen = groups.reduce((a, c) => a + c.length, 0)

  // calcula média e desvio padrão
  const rowCalc = (arr) => {
    const n = arr.length
    let m = arr.reduce((a, b) => a + b) / n
    return {m: m, s: Math.sqrt(arr.map(x => Math.pow(x - m, 2)).reduce((a, b) => a + b) / n)}
  }

  // determina indice do valor máximo
  const argMax = arr => [].map.call(arr, (x, i) => [x, i]).reduce((a, c) => (c[0] > a[0] ? c : a))[1]

  // calcula parâmetros para as colunas dos grupos
  const model = groups.map(matrix => {
    let calc = matrix[0].map((_, i) => {
      let col = matrix.map(item => item[i])
      return rowCalc(col)
    })
    return {matrix: matrix, calc: calc}
  })

  return arrIn => {
    const scores = model.map(groupObj => {
      // cria atalhos para o grupo de dados e os calculos
      const groupMatrix = groupObj.matrix
      const groupCalc = groupObj.calc
      
      // chute inicial
      let priorProbability = groupMatrix.length/dataLen
      
      // obtem probabilidade dos dados de entrada pertencer ao grupo atual
      let p = arrIn.reduce((a, x, i) => {
        let std = groupCalc[i].s

        // ignora quando desvio padrão é zero
        if (std === 0) return a
        
        let mean = groupCalc[i].m
        // pega likelihood da distribuição normal. 
        // O calculo da pdf foi roubado de:
        // https://github.com/jstat/jstat/blob/1.x/src/distribution.js#L523
        let L = Math.exp(-0.5 * Math.log(2 * Math.PI) -
          Math.log(std) - Math.pow(x - mean, 2) / (2 * std * std))
        
        // calcula o log e soma para evitar underflow
        return a + Math.log(L)
      }, Math.log(priorProbability))
      return p
    })
    return argMax(scores)
  }
}

/*
Dados inventados para teste.
col0: a com desvio pequeno e b com desvio grande. As médias são parecidas.
col1: a com desvio grande e b com desvio pequeno. As médias são parecidas.
col2: a e b com desvio parecido e média parecida.
col3: a com desvio e média ligeiramente inferior.
*/

/*
let data = [
// col0 col1 col2 col3
  [0.2, 1.6, 8.0, 4.0, 'a'],
  [0.1, 1.5, 7.0, 4.0, 'a'],
  [0.2, 1.6, 8.0, 4.0, 'a'],  
  [0.1, 1.5, 7.0, 4.0, 'a'],
  [0.2, 1.6, 8.0, 4.0, 'a'],
  [0.4, 1.1, 7.0, 6.0, 'b'],
  [0.6, 1.2, 8.0, 7.0, 'b'],
  [0.4, 1.1, 7.0, 6.0, 'b'],
  [0.4, 1.1, 7.0, 6.0, 'b'],
  [0.6, 1.3, 8.0, 7.0, 'b']
]


// separa grupos
let grupoA = data.filter(item => item[4] === 'a').map(item => item.slice(0, 4))
let grupoB = data.filter(item => item[4] === 'b').map(item => item.slice(0, 4))

let b = bayes([grupoA, grupoB])

// vamos utilizar o modelo para descrobrir a qual grupo este array pertence
//const teste = [0.15, 1.54, 7.2, 3.1]; // é a
const teste =  [0.5, 1.3, 7.5, 3.]; // é b
console.log(b(teste))
*/