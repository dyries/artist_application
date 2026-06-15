#!/bin/zsh
cd "$(dirname "$0")" || exit 1

HOST="127.0.0.1"
PORT="3000"
URL="http://${HOST}:${PORT}"

if lsof -nP -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "端口 ${PORT} 已经被占用。"
  echo "请先在旧的项目终端窗口按 Control + C 停止服务，然后再双击这个启动器。"
  echo
  echo "如果你不确定哪个窗口在运行，可以直接打开：${URL}"
  read -r "?按回车关闭窗口..."
  exit 1
fi

echo "正在启动本地项目..."
echo "启动成功后会自动打开：${URL}"
echo

npm run dev -- -H "${HOST}" -p "${PORT}" &
SERVER_PID=$!

for _ in {1..60}; do
  if curl -fsS "${URL}" >/dev/null 2>&1; then
    open "${URL}"
    wait "${SERVER_PID}"
    exit $?
  fi
  sleep 1
done

echo
echo "项目启动超时。请检查上面的错误信息。"
kill "${SERVER_PID}" >/dev/null 2>&1
read -r "?按回车关闭窗口..."
