// Trace List Column Classes

export const columnLineNumberClasses = "\
shrink-0 \
1mr-2 \
px-1 \
w-7 \
h-full \
text-[0.6rem] \
text-right \
text-gray-400 \
border-gray-200 dark:border-gray-800 \
border-r \
select-none \
flex items-center justify-end \
";

export const columnTimeClasses = "\
shrink-0 \
pl-0.5 \
h-full \
text-[0.6rem] \
tabular-nums \
text-gray-500 \
border-gray-200 dark:border-gray-800 \
truncate \
border-r \
select-none \
flex items-center \
";

export const columnThreadIdClasses = "\
shrink-0 \
w-16 \
text-yellow-600 dark:text-yellow-500 \
border-gray-200 dark:border-gray-800 \
border-r \
select-none \
";

// Trace List Row Classes

export const lineClasses = "\
text-xs \
font-mono \
whitespace-pre \
border-l-4 \
cursor-default \
flex items-center \
";

export const lineCurrentClasses = "\
bg-muted-foreground/20 \
group-focus/tracelist:bg-blue-100 group-focus/tracelist:dark:bg-blue-900 \
group-focus-visible/tracelist:bg-blue-100 group-focus-visible/tracelist:dark:bg-blue-900 \
\
border-foreground dark:border-foreground/50 \
group-focus/tracelist:border-blue-500 group-focus/tracelist:dark:border-blue-500 \
\
outline-1 -outline-offset-1 \
outline-primary dark:outline-primary/50 \
\
group-focus/tracelist:outline-blue-500 group-focus/tracelist:dark:outline-blue-500 \
group-focus-visible/tracelist:outline-blue-500 group-focus-visible/tracelist:dark:outline-blue-500 \
";

export const lineNotCurrentClasses = "\
hover:bg-gray-100 dark:hover:bg-gray-800 \
border-transparent";

export const lineErrorClasses = "bg-red-50 dark:bg-red-900/20";

//
