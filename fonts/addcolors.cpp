#include <string>
#include <string_view>
#include <vector>
#include <array>
#include <map>
#include <unordered_map>
#include <algorithm>
#include <stdexcept>
#include <charconv>

#include <cstdint>
#include <cstddef>
#include <cstring>

#include <iostream>
#include <fstream>
#include <iomanip>

using uint8 = std::uint8_t;
using uint16 = std::uint16_t;
using sint16 = std::int16_t;
using uint32 = std::uint32_t;
using sint32 = std::int32_t;
using sint64 = std::int64_t;

struct Tag : std::array<char, 4> {
  using Base = std::array<char, 4>;

  bool operator == (const std::string_view val) const {
    return val.size() == 4
      && val[0] == this->operator[](0)
      && val[1] == this->operator[](1)
      && val[2] == this->operator[](2)
      && val[3] == this->operator[](3);
  }

  using Base::array;

  Tag(std::string_view sv) {
    if(sv.length() != 4)
      throw std::logic_error("Tag length != 4.");
    Base::operator=(std::array{sv[0], sv[1], sv[2], sv[3]});
  }

  friend std::ostream& operator << (std::ostream& os, Tag t) {
    return os << std::string_view(t.begin(), t.end());
  }

  friend bool operator < (const Tag& t1, const Tag& t2) {
    for(int i = 0; i < 4; i++)
      if(t1[i] < t2[i]) return true;
      else if(t1[i] > t2[i]) return false;
    return false;
  }
};

struct Table {
  Tag tag;
  uint32 off;
  uint32 len;
  std::string data;

  Table(Tag tag_, uint32 off_, uint32 len_) : tag(tag_), off(off_), len(len_), data() { }

  Table(Tag tag_, std::string data_) : tag(tag_), off(-1), len(data_.length()),
    data(std::move(data_)) { }
};

struct Tables : std::vector<Table> {
  template<typename T>
    typename std::enable_if<!std::is_integral_v<T>, Table&>::type
  operator [] (T tag) {
    auto it = std::find_if(this->begin(), this->end(), [&tag](const auto& t) { return t.tag == tag; });
    if(it == this->end())
      throw std::out_of_range("Table not found.");
    else
      return *it;
  }

  template<typename T>
    typename std::enable_if<std::is_integral_v<T>, const Table&>::type
  operator[](T ix) {
    return std::vector<Table>::operator[](ix);
  }
};

struct Segment {
  uint16 start;
  uint16 end;
  uint16 delta;
};

template<typename T>
constexpr bool is_array = false;

template<typename T, std::size_t N>
constexpr bool is_array<std::array<T, N>> = true;

class ICodec {
  std::streambuf& sbuf;

  public:
  ICodec(std::streambuf& in): sbuf(in) { }

  template<typename T>
  auto read() {
    T out;
    if constexpr(is_array<T>) {
      for(T& x : out)
        read<T>(x);
    } else {
      std::array<char, sizeof(T)> in;
      sbuf.sgetn(in.data(), in.size());
      if constexpr(std::is_integral_v<T>)
        std::reverse(in.begin(), in.end());
      std::memcpy(&out, &in, sizeof(T));
    }
    return out;
  }

  template<typename T, typename It>
  void read_array(It begin, It end) {
    for(auto it = begin; it != end; it++)
      *it = read<T>();
  }

  std::string read_data(std::size_t len) {
    std::string ret(len, 0);
    sbuf.sgetn(ret.data(), ret.length());
    return ret;
  }

  template<typename T>
  void skip(std::size_t count = 1) {
    sbuf.pubseekoff(count * sizeof(T), std::ios_base::cur, std::ios_base::in);
  }

  void seek(std::size_t pos) {
    sbuf.pubseekpos(pos, std::ios_base::in);
  }

  auto pos() {
    return sbuf.pubseekoff(0, std::ios_base::cur, std::ios_base::in);
  }

  auto size() {
    auto prev = sbuf.pubseekoff(0, std::ios_base::cur, std::ios_base::in);
    auto end = sbuf.pubseekoff(0, std::ios_base::end, std::ios_base::in);
    sbuf.pubseekpos(prev, std::ios_base::in);
    return end;
  }
};

class OCodec {
  std::streambuf& sbuf;

  public:
  OCodec(std::streambuf& in): sbuf(in) { }

  template<typename T, bool R = std::is_integral_v<T>>
  void write(T in) {
    if constexpr(is_array<T>) {
      for(const auto x : in)
        write<>(x);
    } else {
      std::array<char, sizeof(T)> out;
      std::memcpy(out.data(), &in, sizeof(T));
      if constexpr(std::is_integral_v<T>)
        std::reverse(out.begin(), out.end());
      sbuf.sputn(out.data(), sizeof(T));
    }
  }

  void write_data(std::string_view data) {
    sbuf.sputn(data.data(), data.length());
  }

  auto pos() {
    return sbuf.pubseekoff(0, std::ios_base::cur, std::ios_base::out);
  }

  void align(uint16 level, char value = 0) {
    auto power = 1 << level;
    auto rem = pos() & (power - 1);
    if(rem != 0) {
      std::string zeroes(power - rem, value);
      sbuf.sputn(zeroes.data(), zeroes.size());
    }
  }

  void seek(std::size_t pos) {
    sbuf.pubseekpos(pos, std::ios_base::out);
  }
};

template<typename T>
OCodec& operator << (OCodec& c, const T& value) {
  c.write<>(value);
  return c;
}

OCodec& operator << (OCodec& c, std::string_view sv) {
  c.write_data(sv);
  return c;
}

OCodec& operator << (OCodec& c, const std::string& s) {
  c.write_data(s);
  return c;
}

class XStringBuf : public std::streambuf {
  std::string& buf;

  public:
  XStringBuf(std::string& str) : buf(str) {
    setg(buf.data(), buf.data(), buf.data() + buf.size());
    setp(buf.data(), buf.data() + buf.size());
  }

  protected:
  virtual pos_type seekoff(off_type off, std::ios_base::seekdir dir, std::ios_base::openmode which = std::ios_base::in | std::ios_base::out) override {
    pos_type ret = pos_type(-1);
    if(which & std::ios_base::in) {
      setg(eback(), dir == std::ios_base::beg
          ? eback() + off
          : dir == std::ios_base::cur
            ? gptr() + off
            : egptr() + off, egptr());
      ret = gptr() - eback();
    }
    if(which & std::ios_base::out) {
      if(dir == std::ios_base::cur)
        pbump(off);
      else {
        setp(buf.data(), buf.data() + buf.size());
        pbump(dir == std::ios_base::beg
          ? off
          : buf.size() + off);
      }
      ret = pptr() - pbase();
    }
    return ret;
  }

  virtual pos_type seekpos(pos_type pos, std::ios_base::openmode which = std::ios_base::in | std::ios_base::out) override {
    return seekoff(pos, std::ios_base::beg, which);
  }
};

std::array<uint16, 4> to_selectors(uint16 size) {
  uint16 bits = 0;
  for(int x = size; x; x >>= 1)
    bits++;
  bits -= 1;
  uint16 base = 16 << bits;
  return {size,
    base, // searchRange
    bits, // entrySelector
    static_cast<uint16>(16*size - base) // rangeShift
  };
}

uint32 cksum(std::string_view sv) {
  uint32 sum = 0;
  auto count_full = sv.size() / 4;
  for(unsigned long i = 0; i < count_full + 1; i++) {
    std::array<char, 4> buf;
    if(i < count_full)
      std::memcpy(buf.data(), sv.begin() + 4 * i, 4);
    else {
      std::memset(buf.data(), 0, 4);
      std::memcpy(buf.data(), sv.begin() + 4 * i, sv.size() - count_full * 4);
    }
    std::reverse(buf.begin(), buf.end());
    uint32 r;
    std::memcpy(&r, buf.data(), 4);
    sum += r;
  }
  return sum;
}

void check(bool cond) {
  if(!cond)
    throw std::runtime_error("Assertion failed: use gdb.");
}

int main() {
  try {
    Tables tables{};

    /* Cache entire input OTF */
    {
      std::filebuf inBuf;
      if(!inBuf.open("SPA3.otf", std::ios_base::in | std::ios_base::binary))
        throw std::runtime_error("Can't open file for reading.");
      ICodec in{inBuf};
      check(in.read<Tag>() == "OTTO");
      auto numTables = in.read<uint16>();
      in.skip<uint16>(3);

      for(uint16 i = 0; i < numTables; i++)
        tables.push_back({in.read<Tag>(), (in.skip<uint32>(), in.read<uint32>()), in.read<uint32>()});

      std::sort(tables.begin(), tables.end(),
        [](const auto& t1, const auto& t2) { return t1.off < t2.off; });

      for(auto& table : tables) {
        in.seek(table.off);
        table.data = in.read_data(table.len);
      }
    }

    /* Read color instructions */
    const auto [palette, glyphLayers] = [&]() {
      std::ifstream is{"color.in"};
      uint16 psize;
      is >> psize;

      std::vector<std::array<uint8, 4>> palette;
      for(uint16 i = 0; i < psize; i++) {
        std::string entry;
        is >> entry;
        check(entry.length() == 8);
        uint8 red, green, blue, alpha;
        std::from_chars(entry.data(), entry.data() + 2, red, 16);
        std::from_chars(entry.data() + 2, entry.data() + 4, green, 16);
        std::from_chars(entry.data() + 4, entry.data() + 6, blue, 16);
        std::from_chars(entry.data() + 6, entry.data() + 8, alpha, 16);
        palette.push_back({red, green, blue, alpha});
      }

      using Layers = std::vector<std::pair<std::string, uint16>>;
      std::unordered_map<std::string, Layers> glyphLayers{};
      std::string baseGlyphName;
      uint16 numLayers;
      while(is >> baseGlyphName >> numLayers) {
        Layers layers{};
        for(uint16 i = 0; i < numLayers; i++) {
          std::string glyphName;
          uint16 paletteIndex;
          is >> glyphName >> paletteIndex;
          layers.push_back({glyphName, paletteIndex});
        }
        glyphLayers.insert({baseGlyphName, std::move(layers)});
      }
      return std::tuple{std::move(palette), std::move(glyphLayers)};
    }();

#if 0
    /* CMAP */
    std::vector<Segment> segments = [&]() {
      XStringBuf inBuf{tables["cmap"].data};
      ICodec in{inBuf};
      check(in.read<uint16>() == 0);
      auto num = in.read<uint16>();
      auto off = [&]() {
        for(uint16 i = 0; i < num; i++) {
          auto platform = in.read<uint16>();
          auto encoding = in.read<uint16>();
          auto off = in.read<uint32>();
          if(platform == 0 && encoding == 3)
            return off;
        }
        throw std::runtime_error("No unicode CMAP found.");
      }();
      in.seek(off);
      check(in.read<uint16>() == 4); // Format 4: Segment mapping to delta values
      in.skip<uint16>(2);
      auto segCount = in.read<uint16>() / 2;
      in.skip<uint16>(3);
      std::vector<Segment> segments(segCount);
      for(uint16 i = 0; i < segCount; i++)
        segments[i].end = in.read<uint16>();
      in.skip<uint16>();
      for(uint16 i = 0; i < segCount; i++)
        segments[i].start = in.read<uint16>();
      for(uint16 i = 0; i < segCount; i++)
        segments[i].delta = in.read<uint16>();
      /*for(const auto& seg : segments)
        std::cout << std::hex
          << std::setw(4) << seg.start << "  "
          << std::setw(4) << seg.end << "  "
          << std::setw(4) << seg.delta << "  "
          << std::dec << '\n';*/
      return segments;
    }();

    auto cmap = [&segments](uint16 uni) -> uint16 {
      for(const auto& seg : segments) {
        if(seg.start <= uni && seg.end >= uni)
          return uni + seg.delta;
      }
      // not found:
      throw std::out_of_range("Unicode value not in font.");
    };
#endif

    /* Read CFF names */
    const auto nameMap = [&]() {
      XStringBuf inBuf{tables["CFF "].data};
      ICodec in{inBuf};
      // HEADER
      check(in.read<uint8>() == 1); // major
      check(in.read<uint8>() == 0); // minor
      check(in.read<uint8>() == 4); // hdrSize
      check(in.read<uint8>() == 4); // offSize
      // INDEX
      check(in.read<uint16>() == 1); // count
      check(in.read<uint8>() == 1); // offSize
      check(in.read<uint8>() == 1); // data0 offset
      {
        auto off1 = in.read<uint8>() - 1; // data1 offset
        in.skip<char>(off1);
      }
      // Top DICT index
      check(in.read<uint16>() == 1); // count
      check(in.read<uint8>() == 2); // offSize
      check(in.read<uint16>() == 1); // off0
      int charsetOffset, charStringsOffset;
      {
        auto off1 = in.read<uint16>(); // data1 offset
        auto end = int(in.pos()) + off1 - 1;
        int lastOp = 0;
        while(in.pos() < end) {
          auto r = in.read<uint8>();
          if(r == 0x1C)
            lastOp = in.read<uint16>();
          else if(r == 0x0F) // charset table offset
            charsetOffset = lastOp;
          else if(r == 0x11)
            charStringsOffset = lastOp;
          else if(r == 0x1D)
            lastOp = in.read<sint32>();
          else if(r >= 0x20 && r <= 0xF6)
            lastOp = r - 139;
          else if(r >= 0xF7 && r <= 0xFA) {
            auto s = in.read<uint8>();
            lastOp = int(r - 0xF7) * 256 + s + 108;
          } else if(r >= 0xFB && r <= 0xFE) {
            auto s = in.read<uint8>();
            lastOp = -(int(r - 0xFB) * 256 + s + 108);
          } else if(r <= 0x15) {
            if(r == 0xC)
              in.skip<uint8>();
            // operand: ignore
          }
          else
            throw std::runtime_error("Unable to parse CFF top DICT.");
        }
      }
      // String index
      std::vector<std::string> glyphNames{};
      {
        auto cnt = in.read<uint16>();
        check(in.read<uint8>() == 2); // offSize
        std::vector<uint16> offsets;
        offsets.resize(cnt + 1);
        in.read_array<uint16>(offsets.begin(), offsets.end());
        auto dataSize = offsets.back() - 1;
        std::vector<char> data;
        data.resize(dataSize);
        in.read_array<char>(data.begin(), data.end());
        for(uint16 i = 0; i < cnt - 1; i++)
          glyphNames.push_back({
            data.begin() + offsets[i] - 1,
            data.begin() + offsets[i+1] - 1});
      }
      in.seek(charStringsOffset);
      auto glyphCount = in.read<uint16>();
      in.seek(charsetOffset);
      check(in.read<uint8>() == 0); // format = SID
      constexpr int nStdStrings = 390;
      std::unordered_map<std::string, uint16> map{};
      for(int i = 1; i < glyphCount; i++)
        map.insert({glyphNames[in.read<uint16>() - (nStdStrings + 1)], i});
      return map;
    }();

    /* Create CPAL */
    {
      std::stringbuf buf{};
      OCodec cpal{buf};
      cpal << uint16(0) // version
        << uint16(palette.size()) // numPaletteEntries
        << uint16(1) // numPalettes
        << uint16(palette.size()) // numPaletteRecords
        << uint32(14) // colorRecordsArrayOffset
        << uint16(0); // colorRecordIndices
      for(const auto& entry : palette)
        cpal << entry[2] << entry[1] << entry[0] << entry[3];
      if(auto it = std::find_if(tables.begin(), tables.end(), [](const Table& t) { return t.tag == "CPAL"; }); it != tables.end())
        tables.erase(it);
      tables.push_back({Tag("CPAL"), buf.str()});
    }

    /* Create COLR */
    {
      std::stringbuf buf{};
      OCodec colr{buf};
      // convert glyphName ↦ [(glyphName, paletteIx)] to glyphID ↦ [(glyphId, paletteIx)]
      std::map<uint16, std::vector<std::pair<uint16, uint16>>> layer_data;
      uint32 layer_offset = 14;
      uint16 layer_records = 0;
      for(const auto& record : glyphLayers) {
        std::vector<std::pair<uint16, uint16>> layers{};
        layers.reserve(record.second.size());
        for(const auto& layer : record.second)
          layers.push_back({nameMap.at(layer.first), layer.second});
        layer_offset += 3 * sizeof(uint16);
        layer_records += layers.size();
        layer_data.insert({nameMap.at(record.first), std::move(layers)});
      }
      colr << uint16(0) // version
        << uint16(layer_data.size()) // numBaseGlyphRecords
        << uint32(14) // baseGlyphRecordsOffset
        << layer_offset // layerRecordsOffset
        << layer_records; // numLayerRecords
      // base glyph record table
      uint16 record_offset = 0;
      for(const auto& record : layer_data) {
        colr << uint16(record.first) // glyphID
          << record_offset // firstLayerIndex
          << uint16(record.second.size()); // numLayers
        record_offset += record.second.size();
      }
      // layer record table
      for(const auto& record : layer_data)
        for(const auto& layer : record.second)
          colr << layer.first // glyphID
            << layer.second; // paletteIndex
      if(auto it = std::find_if(tables.begin(), tables.end(), [](const Table& t) { return t.tag == "COLR"; }); it != tables.end())
        tables.erase(it);
      tables.push_back({Tag("COLR"), buf.str()});
    }

    /*** Begin writeout ***/

    /* Zero out cksumAdjustment */
    {
      XStringBuf buf{tables["head"].data};
      OCodec head{buf};
      head.seek(8);
      head.write<uint32>(0);
    }

    /* Calculate table offsets in file */
    {
      uint32 off = 12 + 16 * tables.size(); // header size
      for(auto& table : tables) {
        table.off = off;
        off += table.len;
        off = (off + 3) & ~3;
      }
    }

    /* Prepare header */
    std::string header = [&]() {
      std::vector<Tag> tags;
      for(const auto& table : tables)
        tags.push_back(table.tag);
      std::sort(tags.begin(), tags.end());

      std::stringbuf ottoBuf{};
      OCodec otto{ottoBuf};
      otto << Tag{"OTTO"}
        << to_selectors(tables.size());
      for(const auto tag : tags) {
        const auto& table = tables[tag];
        otto << table.tag << cksum(table.data) << table.off << table.len;
      }
      return ottoBuf.str();
    }();

    /* Compute final cksumAdjustment */
    {
      uint32 sum = cksum(header);
      for(const auto& table : tables)
        sum += cksum(table.data);
      uint32 adj = 0xb1b0afba - sum;
      XStringBuf buf{tables["head"].data};
      OCodec head{buf};
      head.seek(8);
      head.write<uint32>(adj); // cksumAdjustment
    }

    /* Dump file contents */
    std::filebuf outBuf;
    if(!outBuf.open("SPA3.otf", std::ios_base::out | std::ios_base::binary))
      throw std::runtime_error("Can't open file for reading.");
    OCodec oc{outBuf};
    oc << header;
    for(const auto& table : tables) {
      oc.align(2);
      oc << table.data;
    }

    return 0;
  }
  catch(std::exception& e) {
    std::cerr << e.what() << '\n';
    return 1;
  }
}
