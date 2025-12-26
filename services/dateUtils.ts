
export const START_DATE = "1404/09/28";

export const getIndexFromDate = (dateStr: string): number => {
    if(!dateStr) return -1;
    // Normalize separator
    const normalized = dateStr.replace(/-/g, '/').replace(/\./g, '/');
    const parts = normalized.split('/');
    if(parts.length !== 3) return -1;
    
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    
    // Days count from start of year to start of month
    // 1-6: 31 days
    // 7-11: 30 days
    // 12: 29 days
    const getDOY = (month: number, day: number) => {
        let count = 0;
        for(let i=1; i<month; i++) {
            if(i<=6) count+=31;
            else if(i<=11) count+=30;
            else count+=29;
        }
        return count + day;
    };
    
    // DOY for 1404/09/28
    // 6*31 + 2*30 + 28 = 186 + 60 + 28 = 274
    const startDOY = 274; 
    const currentDOY = getDOY(m, d);
    
    return currentDOY - startDOY;
};

export const getDateFromIndex = (index: number): string => {
    // 1404/09/28 is index 0
    // Azar (9) has 30 days. Days left: 28, 29, 30 => 3 days (Indices 0, 1, 2)
    let rem = index;
    
    // Azar
    if (rem < 3) {
        const d = 28 + rem;
        return `1404/09/${d}`;
    }
    rem -= 3;
    
    // Dey (10) - 30 days
    if (rem < 30) {
        const d = rem + 1;
        return `1404/10/${d < 10 ? '0'+d : d}`;
    }
    rem -= 30;
    
    // Bahman (11) - 30 days
    if (rem < 30) {
        const d = rem + 1;
        return `1404/11/${d < 10 ? '0'+d : d}`;
    }
    rem -= 30;
    
    // Esfand (12) - 29 days
    if (rem < 29) {
        const d = rem + 1;
        return `1404/12/${d < 10 ? '0'+d : d}`;
    }
    
    return "Out of Range";
};

export const getMonthName = (dateStr: string): string => {
    const parts = dateStr.split('/');
    if(parts.length < 2) return '';
    const m = parts[1];
    switch(m) {
        case '09': return 'آذر';
        case '10': return 'دی';
        case '11': return 'بهمن';
        case '12': return 'اسفند';
        default: return '';
    }
};
