import React from "react";
import Select from "react-select";
import { useSelector } from "react-redux";

const ListOptions = (props) => {
  const lang = useSelector(state=> state.lang.lang)
  let options =[]
  if(lang ==='EN'){

     options = [
      { value: "Zugdidi  ", label: "Zugdidi" },
      { value: "Tbilisi", label: "Tbilisi" },
      { value: "Batumi", label: "Batumi" },
      { value: "Kutaisi", label: "Kutaisi" },
      { value: "Rustavi", label: "Rustavi" },
    { value: "Gori", label: "Gori" },
    { value: "Poti", label: "Poti" },
    { value: "Khashuri", label: "Khashuri" },
    { value: "Samtredia", label: "Samtredia" },
    { value: "Senaki", label: "Senaki" },
    { value: "Zestafoni", label: "Zestafoni" },
    { value: "Marnieuli", label: "Marnieuli" },
    { value: "Telavi", label: "Telavi" },
 
    { value: "Kobuleti", label: "Kobuleti" },
    { value: "Akhaltsikhe", label: "Akhaltsikhe" },
    { value: "Kobuleti", label: "Kobuleti" },
    { value: "Ozurgeti", label: "Ozurgeti" },
    { value: "Kaspi", label: "Kaspi" },
    { value: "Borjomi", label: "Borjomi" },
    { value: "Mtshketa", label: "Mtshketa" },
    { value: "Gudauri", label: "Gudauri" },
  ];
}
if(lang ==='GE'){

   options = [
    { value: "Zugdidi  ", label: "ზუგდიდი" },
    { value: "Tbilisi", label: "თბილისი" },
    { value: "Batumi", label: "ბათუმი" },
    { value: "Kutaisi", label: "ქუთაისი" },
    { value: "Rustavi", label: "რუსთავი" },
  { value: "Gori", label: "გორი" },
  { value: "Poti", label: "ფოთი" },
  { value: "Khashuri", label: "ხაშური" },
  { value: "Samtredia", label: "სამტრედია" },
  { value: "Senaki", label: "სენაკი" },
  { value: "Zestafoni", label: "ზესტაფონი" },
  { value: "Marnieuli", label: "მარნეული" },
  { value: "Telavi", label: "თელავი" },
  
  { value: "Kobuleti", label: "ქობულეთი" },
  { value: "Akhaltsikhe", label: "ახალციხე" },
  { value: "Kobuleti", label: "ქობულეთი" },
  { value: "Ozurgeti", label: "ოზურგეთი" },
  { value: "Kaspi", label: "კასპი" },
  { value: "Borjomi", label: "ბორჯომი" },
  { value: "Mtshketa", label: "მცხეთა" },
  { value: "Gudauri", label: "გუდაური" },
];
}
  const theme = theme => ({
    ...theme,
    colors: {
      ...theme.colors,
      primary25: "#f3f3f3",
      primary: "orange",

      // All possible overrides
      // primary: '#2684FF',
       primary75: 'orange',
       primary50: 'orange',
      // primary25: '#DEEBFF',

      // danger: '#DE350B',
      // dangerLight: '#FFBDAD',
      
      // neutral0: 'hsl(0, 0%, 100%)',
      // neutral5: 'hsl(0, 0%, 95%)',
      // neutral10: 'hsl(0, 0%, 90%)',
      // neutral20: 'hsl(0, 0%, 80%)',
      // neutral30: 'hsl(0, 0%, 70%)',
      // neutral40: 'hsl(0, 0%, 60%)',
      // neutral50: 'hsl(0, 0%, 50%)',
      // neutral60: 'hsl(0, 0%, 40%)',
      // neutral70: 'hsl(0, 0%, 30%)',
      // neutral80: 'hsl(0, 0%, 20%)',
      // neutral90: 'hsl(0, 0%, 10%)',
    },
    control: () => ({
      // none of react-select's styles are passed to <Control />
      width: 200,
    }),
    // Other options you can use
    // baseUnit: 4,
    // menuGutter: baseUnit * 2
  });
  return (
    <Select
      placeholder={props.placeholder}
      className={props.className}
      onChange={props.onChange}
      id={props.id}
      name={props.name}
      options={options}
      theme={theme}
    />
  );
};

export default ListOptions;
