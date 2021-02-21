all: SPA3-flags.woff2

addcolors: addcolors.cpp
	g++ -std=c++20 addcolors.cpp -o addcolors

SPA3-flags.woff2: addcolors SPA3_flags.otf color.in
	./addcolors
	woff2_compress SPA3-flags.otf

.PHONY: all
