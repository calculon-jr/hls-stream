# hls-stream
Create an hls stream from any media file or url with one command.

Usage: hls-stream <input> [options]

Options:  
  -v, --vcodec <string>    Video codec to transcode to (default: "copy")  
  -a, --acodec <string>    Audio codec to transcode to (default: "aac")  
  --vbitrate <string>      Video bitrate (bit/s)  
  --abitrate <string>      Audio bitrate (bit/s)  
  -p --port <number>       Port to stream to (default: 8080)  
  -d --streamdir <string>  Directory to use for stream files  (default: \<cwd\>)  
  -h, --help               output usage information  
  
## Examples  

Launch stream: ```node hls-stream.js "Z:\Videos\VideoToStream.mkv"```  
Play stream: ```mpv http://localhost:8080/```  

Transcode to 2MB/s stream: ```node hls-stream.js "Z:\Videos\VideoToStream.mkv" -v libx264 --vbitrate 2M```  

Use ./temp for stream files: ```node hls-stream.js "Z:\Videos\VideoToStream.mkv" -d temp"```  

Restream from online stream: ```node hls-stream.js "http://urlofstream/stream.m3u8"```  
