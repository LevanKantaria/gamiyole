const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'Xcode 26 fmt workaround';

const PODFILE_INSERT = `
    # ${MARKER}: fmt 11.x fails to compile with Apple Clang 21 (Xcode 26.4+)
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end

    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      unless content.include?('#{MARKER}')
        patched = content.gsub(
          /#elif defined\\(__cpp_consteval\\)\\n#  define FMT_USE_CONSTEVAL 1/,
          "#elif defined(__cpp_consteval)\\n#  define FMT_USE_CONSTEVAL 0 // #{MARKER}"
        )
        if patched != content
          File.chmod(0644, fmt_base)
          File.write(fmt_base, patched)
        end
      end
    end
`;

/**
 * Patches ios/Podfile so fmt compiles under Xcode 26.4+.
 * @see https://github.com/facebook/react-native/issues/55601
 */
function withXcode26FmtFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (contents.includes(MARKER)) return config;

      const anchor = 'react_native_post_install(';
      const anchorIdx = contents.indexOf(anchor);
      if (anchorIdx === -1) return config;

      let depth = 0;
      let endIdx = -1;
      for (let i = anchorIdx; i < contents.length; i += 1) {
        const ch = contents[i];
        if (ch === '(') depth += 1;
        if (ch === ')') {
          depth -= 1;
          if (depth === 0) {
            endIdx = i + 1;
            break;
          }
        }
      }

      if (endIdx === -1) return config;

      contents = contents.slice(0, endIdx) + PODFILE_INSERT + contents.slice(endIdx);
      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
}

module.exports = withXcode26FmtFix;
