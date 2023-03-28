/*!
 * gWorker1_EnvSelf v1.0.66
 * (c) 2018-2021 yuda-lyu(semisphere)
 * Released under the MIT License.
 */
//sendMessage
function sendMessage(data) {
  self.postMessage(data);
}

//onmessage
self.onmessage = function (e) {
  //dataRecv
  let dataRecv = e.data;
  console.log('inner worker dataRecv:', dataRecv);

  //dataSend
  let dataSend = {
    from: 'inner worker',
    fun: 'call def',
    input: {
      x: 1,
      y: 12.34,
      z: 'mnop'
    },
    recv: dataRecv
  };

  //sendMessage
  sendMessage(dataSend);
  console.log('inner worker dataSend:', dataSend);
};
setTimeout(() => {
  //dataSend
  let dataSend = {
    s: 'delay 5s'
  };

  //sendMessage
  sendMessage(dataSend);
  console.log('inner worker dataSend(after 5s):', dataSend);
}, 5000);
