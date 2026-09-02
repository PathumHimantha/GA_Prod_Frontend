export const toUpperOnChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (val: string) => void,
) => {
  setter(e.target.value.toUpperCase());
};
