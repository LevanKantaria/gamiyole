// Canonical city values are stored in English in the database (shared with the
// web app — see src/i18n.js CITIES); Georgian labels are shown at render time.
export const CITIES = [
  { value: 'Tbilisi', ge: 'თბილისი' },
  { value: 'Batumi', ge: 'ბათუმი' },
  { value: 'Kutaisi', ge: 'ქუთაისი' },
  { value: 'Zugdidi', ge: 'ზუგდიდი' },
  { value: 'Rustavi', ge: 'რუსთავი' },
  { value: 'Gori', ge: 'გორი' },
  { value: 'Poti', ge: 'ფოთი' },
  { value: 'Khashuri', ge: 'ხაშური' },
  { value: 'Samtredia', ge: 'სამტრედია' },
  { value: 'Senaki', ge: 'სენაკი' },
  { value: 'Zestafoni', ge: 'ზესტაფონი' },
  { value: 'Marneuli', ge: 'მარნეული' },
  { value: 'Telavi', ge: 'თელავი' },
  { value: 'Kobuleti', ge: 'ქობულეთი' },
  { value: 'Akhaltsikhe', ge: 'ახალციხე' },
  { value: 'Ozurgeti', ge: 'ოზურგეთი' },
  { value: 'Kaspi', ge: 'კასპი' },
  { value: 'Borjomi', ge: 'ბორჯომი' },
  { value: 'Mtskheta', ge: 'მცხეთა' },
  { value: 'Gudauri', ge: 'გუდაური' },
  { value: 'Bakuriani', ge: 'ბაკურიანი' },
  { value: 'Sachkhere', ge: 'საჩხერე' },
  { value: 'Mestia', ge: 'მესტია' },
  { value: 'Lagodekhi', ge: 'ლაგოდეხი' },
  { value: 'Chiatura', ge: 'ჭიათურა' },
  { value: 'Kazbegi', ge: 'ყაზბეგი' },
  { value: 'Gurjaani', ge: 'გურჯაანი' },
  { value: 'Lanchkhuti', ge: 'ლანჩხუთი' },
  { value: 'Martvili', ge: 'მარტვილი' },
  { value: 'Terjola', ge: 'თერჯოლა' },
  { value: 'Kvareli', ge: 'ყვარელი' },
  { value: 'Baghdati', ge: 'ბაღდათი' },
  { value: 'Kacreti', ge: 'კაჭრეთი' },
  { value: 'Tskaltubo', ge: 'წყალტუბო' },
  { value: 'Ambrolauri', ge: 'ამბროლაური' },
  { value: 'Dusheti', ge: 'დუშეთი' },
  { value: 'Tkibuli', ge: 'ტყიბული' },
  { value: 'Kharagauli', ge: 'ხარაგაული' },
  { value: 'Sighnaghi', ge: 'სიღნაღი' },
  { value: 'Bolnisi', ge: 'ბოლნისი' },
  { value: 'Sagarejo', ge: 'საგარეჯო' },
  { value: 'Akhalkalaki', ge: 'ახალქალაქი' },
  { value: 'Tsalenjikha', ge: 'წალენჯიხა' },
  { value: 'Kakheti', ge: 'კახეთი' },
];

export const cityLabel = (value, isGeorgian) => {
  const city = CITIES.find((c) => c.value === (value || '').trim());
  if (!city) return value;
  return isGeorgian ? city.ge : city.value;
};
