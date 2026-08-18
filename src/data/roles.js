// The five roles the CAREER section introduces, and the photograph each one is
// introduced with.
//
// Shared, because there are two layouts for them now: the desktop's wheel
// (CareerSection) and the phone's horizon (mobile/MobileCareer). The list is
// the content; how it is turned is each section's own business — same split,
// and for the same reason, as data/learn.
//
// `imgFit` is how a frame sits in its box. Four of them are simply centred;
// role 4's crop is its own, and it is here rather than in a layout because it
// belongs to the photograph.
import role1Img from "../assets/role/1.avif";
import role2Img from "../assets/role/2.avif";
import role3Img from "../assets/role/3.avif";
import role4Img from "../assets/role/4.avif";
import role5Img from "../assets/role/5.avif";

export const ROLES = [
  {
    n: 1,
    title: "Daughter",
    desc: "표현이 서툰 부모님을 위해,\n먼저 원하는 걸 제안할 줄 아는 딸",
    img: role1Img,
    imgFit: { position: "center" },
  },
  {
    n: 2,
    title: "Older sister",
    desc: "내가 겪은 불편을 동생은 겪지 않도록 살피는 언니이자 누나",
    img: role2Img,
    imgFit: { position: "center" },
  },
  {
    n: 3,
    title: "Friend",
    desc: "사소한 말도 기억하고 챙기는 친구",
    img: role3Img,
    imgFit: { position: "center" },
  },
  {
    n: 4,
    title: "Student",
    desc: "옳다고 생각한 일은\n스스로 해내던 학생",
    img: role4Img,
    imgFit: {
      custom: { width: "100%", height: "138.64%", left: "0%", top: "-11.25%" },
    },
  },
  {
    n: 5,
    title: "Employee",
    desc: "맡은 일은 방법을 찾아내서라도\n끝내는 직원",
    img: role5Img,
    imgFit: { position: "center" },
  },
];
