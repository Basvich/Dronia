/// <reference lib="webworker" />

addEventListener('message', ({ data }) => {
  const start = Date.now();
  console.log('worker begin on',data);
  while (Date.now() < start + 5000) {
  }
  console.log('worker end on',data);
  postMessage(data + 1);
});
