name=$1
temp=`mktemp`

echo -e '{\n  "_prefix": ""\n}' > trans/cs/$name.json
echo -e '{\n  "_prefix": ""\n}' > trans/en/$name.json

head -n -2 trans/cs/modules.json > $temp
echo -e '  },\n  {\n    "moduleName": "'$name'",\n    "displayName": ""' >> $temp
tail -n 2 trans/cs/modules.json >> $temp
cat $temp > trans/cs/modules.json
head -n -2 trans/en/modules.json > $temp
echo -e '  },\n  {\n    "moduleName": "'$name'",\n    "displayName": ""' >> $temp
tail -n 2 trans/en/modules.json >> $temp
cat $temp > trans/en/modules.json
rm $temp
vi trans/cs/modules.json trans/en/modules.json

cat <<END > js/$name.js
import _, * as i18n from './i18n.js';

export default function(root) {
  return {};
}
END

cat <<END > html/$name.html
<!doctype html>
<main>
</main>
END

touch css/$name.css
