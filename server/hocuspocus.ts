// import { Server } from "@hocuspocus/server";

// // 定义回调参数类型
// interface HocuspocusPayload {
//   documentName: string;
//   context: {
//     user?: {
//       name?: string;
//     };
//   };
// }

// // 创建 Hocuspocus 服务器
// const server = Server.configure({
//   port: 1234,
//   name: "notes-server",
  
//   async onConnect(data: HocuspocusPayload) {
//     console.log(`Client connected: ${data.context.user?.name || "anonymous"}`);
//   },

//   async onDisconnect(data: HocuspocusPayload) {
//     console.log(`Client disconnected: ${data.context.user?.name || "anonymous"}`);
//   },

//   async onLoadDocument(data: HocuspocusPayload) {
//     console.log(`Loading document: ${data.documentName}`);
//     // 这里可以从数据库加载文档
//     return null;
//   },

//   async onStoreDocument(data: HocuspocusPayload) {
//     console.log(`Storing document: ${data.documentName}`);
//     // 这里可以保存文档到数据库
//   },

//   async onDestroy(data: HocuspocusPayload) {
//     console.log(`Destroying document: ${data.documentName}`);
//   },
// });

// // 启动服务器
// const PORT = process.env.PORT || 1234;

// server.listen(PORT, () => {
//   console.log(`Hocuspocus server is running on port ${PORT}`);
// });

// export { server };

