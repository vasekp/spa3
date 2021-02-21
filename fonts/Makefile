all: SPA3.woff2

addcolors: addcolors.cpp
	g++ -std=c++20 addcolors.cpp -o addcolors

SPA3.woff2: addcolors SPA3.otf color.in
	./addcolors
	woff2_compress SPA3.otf

.PHONY: all
